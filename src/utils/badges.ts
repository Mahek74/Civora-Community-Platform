export interface Badge {
  id: string;
  name: string;
  requirement: string;
  icon: string;
  color: string;
  description: string;
  unlocked: boolean;
}

export function getUserBadges(reportsCount: number, points: number): Badge[] {
  return [
    {
      id: 'bronze',
      name: 'Bronze Reporter',
      requirement: '1+ reports filed',
      icon: '🥉',
      color: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
      description: 'Filed your first civic report on CivicPulse.',
      unlocked: reportsCount >= 1
    },
    {
      id: 'silver',
      name: 'Silver Reporter',
      requirement: '5+ reports filed',
      icon: '🥈',
      color: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
      description: 'Consistently reporting local issues.',
      unlocked: reportsCount >= 5
    },
    {
      id: 'gold',
      name: 'Gold Reporter',
      requirement: '15+ reports filed',
      icon: '🥇',
      color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
      description: 'A dedicated champion of civic cleanliness.',
      unlocked: reportsCount >= 15
    },
    {
      id: 'hero',
      name: 'Civic Hero',
      requirement: '50+ reports filed',
      icon: '👑',
      color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
      description: 'An exemplary pillar of the civic community.',
      unlocked: reportsCount >= 50
    },
    {
      id: 'champion',
      name: 'Environmental Champion',
      requirement: '500+ points earned',
      icon: '🏆',
      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
      description: 'Earned a monumental 500+ reward points.',
      unlocked: points >= 500
    }
  ];
}

export function getHighestBadge(reportsCount: number, points: number): Badge | null {
  const badges = getUserBadges(reportsCount, points).filter(b => b.unlocked);
  if (badges.length === 0) return null;
  
  // Priority order for main displaying badge
  const order = ['champion', 'hero', 'gold', 'silver', 'bronze'];
  for (const id of order) {
    const found = badges.find(b => b.id === id);
    if (found) return found;
  }
  return null;
}
