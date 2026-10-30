import { notFound } from "next/navigation";
import CallsIvrPage from "@/components/calls-ivr/calls-ivr-page";

const sections = ["logs", "ivr", "follow-ups", "mapping", "settings"];

export default async function CallsIvrSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  return <CallsIvrPage section={section} />;
}
