export interface KPIParams {
    attendancePercentage: number; // 0-100
    tasksCompletedPercentage: number; // 0-100 or relative
    avgPeerReviewScore: number; // 1-5 or 1-10 scale? Assuming 1-10 or 1-5 converted to 100.
}

export interface AuditorResult {
    finalScore: number;
    isEligibleForBonus: boolean;
    bonusPercentage: number;
    breakdown: {
        attendanceScore: number;
        performanceScore: number;
        reviewScore: number;
    }
}

export function calculateKPIScore(data: KPIParams): AuditorResult {
    // Weights (can be adjusted)
    // Attendance: 40%
    // Tasks: 40%
    // Reviews: 20%

    const attendanceScore = Math.min(100, Math.max(0, data.attendancePercentage)) * 0.4;

    // Tasks (assuming >90% completion is good)
    const performanceScore = Math.min(100, Math.max(0, data.tasksCompletedPercentage)) * 0.4;

    // Peer Reviews (Normalized to 100)
    // If input is 4.5/5 -> 90
    const normalizedReview = (data.avgPeerReviewScore / 5) * 100;
    const reviewScore = Math.min(100, Math.max(0, normalizedReview)) * 0.2;

    const finalScore = attendanceScore + performanceScore + reviewScore;

    // Bonus Logic: if Score > 90 -> 5% bonus
    const isEligibleForBonus = finalScore > 90;
    const bonusPercentage = isEligibleForBonus ? 5 : 0;

    return {
        finalScore: Math.round(finalScore * 10) / 10, // Round to 1 decimal
        isEligibleForBonus,
        bonusPercentage,
        breakdown: {
            attendanceScore,
            performanceScore,
            reviewScore
        }
    };
}
