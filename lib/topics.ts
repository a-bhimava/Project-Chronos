import topicsData from "@/data/topics.json";
import type { Topic } from "@/lib/types";

export const topics: Topic[] = topicsData.topics;

export function getTopic(id: string): Topic | undefined {
  return topics.find((t) => t.id === id);
}
