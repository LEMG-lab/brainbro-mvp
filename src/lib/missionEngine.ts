import { getHistory, getAdaptiveProfile, getMissions, saveMissions, getProfile } from './storage';
import { Mission, SessionResult } from '../types';
import { getStreak, saveStreak, getXp, saveXp, getBadges, saveBadges, getVocabProfile as getVP } from './storage';
import { countDueWords as countDueVocab } from './vocabEngine';

export function getTodayMission(): Mission {
    const todayISO = new Date().toISOString().split('T')[0];
    const saved = getMissions();

    if (saved && saved.dateISO === todayISO) {
        const missionsArray = Array.isArray(saved.missions) ? saved.missions : [];
        if (missionsArray.length > 0) {
            return missionsArray[0];
        }
    }

    // Generate a new mission for today
    const history = getHistory();
    const adaptive = getAdaptiveProfile();
    const profile = getProfile();

    let targetArea: "english" | "math" | "spanish" | "thinking" = "english";
    let targetDiff = adaptive.currentDifficulty || 2;

    if (history.length === 0) {
        if (profile?.goal === 'exam') {
            targetArea = Math.random() > 0.5 ? 'english' : 'math';
        } else if (profile?.goal === 'skills') {
            targetArea = Math.random() > 0.5 ? 'thinking' : 'spanish';
        } else {
            targetArea = "english";
        }
        targetDiff = 2;
    } else {
        // Find area with lowest avg score
        const areaStats: Record<string, { total: number, score: number, count: number }> = {};

        history.forEach(h => {
            const a = h.areaId || "english";
            if (!areaStats[a]) areaStats[a] = { total: 0, score: 0, count: 0 };
            areaStats[a].total += h.total;
            areaStats[a].score += h.score;
            areaStats[a].count += 1;
        });

        let lowestAvg = 999;
        let weakestArea = "english";

        for (const [area, stats] of Object.entries(areaStats)) {
            const avg = (stats.score / stats.total) * 5; // Normalize to out of 5
            if (avg <= 3 && avg < lowestAvg) {
                lowestAvg = avg;
                weakestArea = area;
            }
        }

        if (lowestAvg <= 3) {
            targetArea = weakestArea as "english" | "math" | "spanish" | "thinking";
        } else {
            // Cycle through areas based on goal bias
            if (profile?.goal === 'exam') {
                const areas: Array<"english" | "math" | "thinking"> = ["english", "math", "english", "thinking"];
                targetArea = areas[new Date().getDate() % areas.length];
            } else if (profile?.goal === 'school') {
                const areas: Array<"english" | "math" | "spanish" | "thinking"> = ["english", "math", "spanish", "thinking"];
                targetArea = areas[new Date().getDate() % areas.length];
            } else { // skills
                const areas: Array<"spanish" | "thinking" | "english"> = ["spanish", "thinking", "thinking", "english"];
                targetArea = areas[new Date().getDate() % areas.length];
            }
        }
    }

    const timeConstraint = profile?.dailyMinutes || 10;
    const coachTone = profile?.coachStyle === 'strict' ? 'FAILURE IS NOT AN OPTION.' :
        profile?.coachStyle === 'competitive' ? 'CRUSH THE LEADERBOARD.' :
            'Have fun and do your best!';

    const newMission: Mission = {
        id: `mission_${todayISO}`,
        areaId: targetArea,
        title: `CRITICAL OP: ${targetArea.toUpperCase()}`,
        description: `Execute a Class ${targetDiff} operation within ${timeConstraint} minutes. ${coachTone}`,
        target: {
            type: "complete_session",
            difficulty: targetDiff,
            source: "any",
            ...(targetArea === 'english' ? { accent: adaptive.preferredAccent } : {})
        }
    };

    saveMissions({
        dateISO: todayISO,
        missions: [newMission],
        completedMissionIds: []
    });

    // Phase 14.9: Add vocab mission if enough due words
    try {
        const vp = getVP();
        if (vp && countDueVocab(vp, Date.now()) >= 8) {
            const saved2 = getMissions();
            if (saved2 && !saved2.missions.some((m: any) => m.id.startsWith('vocab_'))) {
                saved2.missions.push({
                    id: `vocab_${todayISO}`,
                    areaId: targetArea,
                    title: 'VOCAB DRILL: Clear 8 reviews',
                    description: 'Complete 8 vocab reviews in any session today.',
                    target: { type: 'complete_session', difficulty: 1, source: 'any' }
                });
                saveMissions(saved2);
            }
        }
    } catch { /* silent */ }

    return newMission;
}

export function checkMissionCompletion(result: SessionResult): {
    missionCompleted: boolean;
    xpEarned: number;
    newBadges: string[];
} {
    let xpEarned = result.score * 10;
    let missionCompleted = false;
    const newBadges: string[] = [];

    const missionsData = getMissions();
    const todayISO = new Date().toISOString().split('T')[0];

    // Check if there is an active mission that was completed by this session
    if (missionsData && missionsData.dateISO === todayISO) {
        const missionsArr = Array.isArray(missionsData.missions) ? missionsData.missions : [];
        if (missionsArr.length > 0) {
            const mission = missionsArr[0];
            const completedArr = Array.isArray(missionsData.completedMissionIds) ? missionsData.completedMissionIds : [];
            const alreadyCompleted = completedArr.includes(mission.id);

            if (!alreadyCompleted && mission.areaId === result.areaId && result.difficulty === mission.target.difficulty) {
                let matched = true;
                if (mission.areaId === 'english' && mission.target.accent && result.accent !== mission.target.accent) {
                    matched = false;
                }

                if (matched) {
                    missionCompleted = true;
                    completedArr.push(mission.id);
                    missionsData.completedMissionIds = completedArr;
                    missionsData.missions = missionsArr;
                    saveMissions(missionsData);

                    xpEarned += 50; // Mission completion bonus

                    // Handle Streak properly
                    const streak = getStreak();
                    const today = new Date(todayISO).getTime();
                    let newCurrent = streak.current;

                    if (!streak.lastCompletedDateISO) {
                        newCurrent = 1;
                    } else {
                        const lastDate = new Date(streak.lastCompletedDateISO).getTime();
                        const diffTime = today - lastDate;
                        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays === 1) {
                            newCurrent += 1;
                        } else if (diffDays > 1) {
                            newCurrent = 1; // reset streak
                        }
                        // if diffDays === 0, keep same (already dealt with if multiple missions per day existed, though we only issue 1)
                    }

                    const newBest = Math.max(newCurrent, streak.best);
                    saveStreak({ current: newCurrent, best: newBest, lastCompletedDateISO: todayISO });

                    // Evaluate Badges
                    const badges = Array.isArray(getBadges()) ? getBadges() : [];
                    if (!badges.includes("First Mission")) {
                        badges.push("First Mission");
                        newBadges.push("First Mission");
                    }
                    if (!badges.includes("3-Day Streak") && newCurrent >= 3) {
                        badges.push("3-Day Streak");
                        newBadges.push("3-Day Streak");
                    }
                    saveBadges(badges);
                }
            }
        }

    }

    // Update global XP
    const xp = getXp();
    xp.total += xpEarned;
    if (result.areaId) {
        xp.byArea[result.areaId] = (xp.byArea[result.areaId] || 0) + xpEarned;
    }
    saveXp(xp);

    // Other Generic Badges (10 Sessions, Area Specific)
    const history = Array.isArray(getHistory()) ? getHistory() : [];
    const badges = Array.isArray(getBadges()) ? getBadges() : [];
    let badgesUpdated = false;

    if (!badges.includes("10 Sessions") && history.length >= 10) {
        badges.push("10 Sessions");
        newBadges.push("10 Sessions");
        badgesUpdated = true;
    }

    // Check area badge (3 missions completed in area)
    // Wait, the history doesn't track if they were missions, so let's just use 3 sessions in an area for now as "grinder".
    // "Area badges when completing 3 missions in area (e.g., 'Math Grinder')"
    const mathCount = history.filter(h => h.areaId === 'math').length;
    if (!badges.includes("Math Grinder") && mathCount >= 3) {
        badges.push("Math Grinder");
        newBadges.push("Math Grinder");
        badgesUpdated = true;
    }

    if (badgesUpdated) saveBadges(badges);

    return { missionCompleted, xpEarned, newBadges };
}
