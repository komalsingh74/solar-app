export const projectStages = [
  "Site survey",
  "Quotation",
  "Approval",
  "Installation",
  "Subsidy",
  "Handover",
] as const;

const projectCountsByStage = [4, 5, 3, 6, 3, 2];

export const projects = projectStages.flatMap((stage, index) =>
  Array.from({ length: projectCountsByStage[index] }, () => ({ stage })),
);
