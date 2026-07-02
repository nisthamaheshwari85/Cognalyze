/* eslint-disable */
import { NextResponse } from "next/server";
import { groqFetch } from "@/lib/groq";

export async function POST(req: Request) {
  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: "No username" }, { status: 400 });

  try {
    const headers: HeadersInit = { "Accept": "application/vnd.github+json" };

    const [userRes, reposRes, eventsRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers }),
      fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=30`, { headers }),
      fetch(`https://api.github.com/users/${username}/events/public?per_page=30`, { headers }),
    ]);

    if (!userRes.ok) return NextResponse.json({ error: "GitHub user not found" }, { status: 404 });

    const user = await userRes.json();
    const repos = reposRes.ok ? await reposRes.json() : [];
    const events = eventsRes.ok ? await eventsRes.json() : [];

    // Language breakdown across all repos
    const langMap: Record<string, number> = {};
    for (const repo of repos) {
      if (repo.language) langMap[repo.language] = (langMap[repo.language] || 0) + 1;
    }
    const topLanguages = Object.entries(langMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([lang, count]) => ({ lang, count }));

    // Top repos by stars
    const topRepos = [...repos]
      .sort((a: any, b: any) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5)
      .map((r: any) => ({
        name: r.name,
        description: r.description,
        stars: r.stargazers_count,
        forks: r.forks_count,
        language: r.language,
        url: r.html_url,
        updated: r.updated_at,
        topics: r.topics || [],
      }));

    // Recent repos (actually worked on)
    const recentRepos = [...repos]
      .sort((a: any, b: any) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
      .slice(0, 5)
      .map((r: any) => ({ name: r.name, language: r.language, updated: r.pushed_at }));

    // Commit activity from events
    const commitCount = events.filter((e: any) => e.type === "PushEvent").length;
    const prCount = events.filter((e: any) => e.type === "PullRequestEvent").length;
    const issueCount = events.filter((e: any) => e.type === "IssuesEvent").length;

    // Call LLM for evaluation
    let evaluation = null;
    try {
      const systemPrompt = `You are a Principal Engineering Manager. Analyze the candidate's GitHub profile based on the raw metrics and repository details provided.
Focus on code quality, documentation, project complexity, languages used, activity, and originality (distinguishing real projects from cloned tutorials/boilerplates).

Respond ONLY with a valid JSON object matching the following structure. Do not output markdown code blocks or any conversational text:
{
  "summary": "1-2 sentences summarizing their coding capability and project originality.",
  "github_activity_score": 75, // Integer between 0 and 100
  "verdict": "Outstanding" | "Strong" | "Moderate" | "Weak",
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Concern 1", "Concern 2"]
}`;

      const userPrompt = `GitHub Profile:
- Username: ${user.login}
- Name: ${user.name || "N/A"}
- Public Repos: ${user.public_repos}
- Total Stars: ${repos.reduce((s: number, r: any) => s + r.stargazers_count, 0)}
- Top Languages: ${JSON.stringify(topLanguages)}
- Top Repositories: ${JSON.stringify(topRepos.map(r => ({ name: r.name, description: r.description, stars: r.stars, language: r.language })))}
- Activity (Recent Events): Commits: ${commitCount}, PRs: ${prCount}, Issues: ${issueCount}`;

      const groqRes = await groqFetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
        }),
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        evaluation = JSON.parse(groqData.choices[0].message.content.trim());
      }
    } catch (err) {
      console.error("[GitHub Analyze] Groq evaluation failed:", err);
    }

    return NextResponse.json({
      profile: {
        username: user.login,
        name: user.name,
        bio: user.bio,
        company: user.company,
        location: user.location,
        public_repos: user.public_repos,
        followers: user.followers,
        following: user.following,
        created_at: user.created_at,
        avatar_url: user.avatar_url,
        blog: user.blog,
      },
      topLanguages,
      topRepos,
      recentRepos,
      activity: { commitCount, prCount, issueCount, totalEvents: events.length },
      totalStars: repos.reduce((s: number, r: any) => s + r.stargazers_count, 0),
      repoCount: repos.length,
      evaluation,
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch GitHub data" }, { status: 500 });
  }
}
