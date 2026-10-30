"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-layout";

export default function DashboardWelcome({ children }: { children: ReactNode }) {
  const [greeting, setGreeting] = useState("Welcome");
  const [today, setToday] = useState("");

  useEffect(() => {
    const now = new Date();
    const date = now.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
    const hour = Number(
      new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        hour12: false,
        timeZone: "Asia/Kolkata",
      }).format(now)
    );

    setToday(date);
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
  }, []);

  return (
    <PageHeader
      title={`${greeting}, Sumit`}
      subtitle={today ? `${today} · Here is what is happening across your solar business today.` : "Here is what is happening across your solar business today."}
    >
      {children}
    </PageHeader>
  );
}
