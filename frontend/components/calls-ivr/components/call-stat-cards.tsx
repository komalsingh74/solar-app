import { Activity, BadgeCheck, PhoneCall, PhoneIncoming, PhoneMissed } from "lucide-react";
import { StatCard } from "@/components/ui/page-layout";

export default function CallStatCards({ totals, pendingFollowUps }: { totals: { total: number; incoming: number; answered: number; missed: number }; pendingFollowUps: number }) {
  const cards = [
    { icon: <PhoneCall size={22} />, value: totals.total, label: "Total calls · selected day" },
    { icon: <PhoneIncoming size={22} />, value: totals.incoming, label: "Incoming calls" },
    { icon: <BadgeCheck size={22} />, value: totals.answered, label: "Answered calls" },
    { icon: <PhoneMissed size={22} />, value: totals.missed, label: `${pendingFollowUps} callback tasks open` },
  ];
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <StatCard key={card.label} icon={card.icon ?? <Activity size={22} />} value={card.value} label={card.label} />)}</div>;
}
