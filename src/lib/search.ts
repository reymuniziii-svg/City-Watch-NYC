import Fuse from "fuse.js";
import type { SearchDocument } from "./types";

export function createSearchIndex(documents: SearchDocument[]): Fuse<SearchDocument> {
  return new Fuse(documents, {
    includeScore: true,
    threshold: 0.32,
    keys: [
      { name: "introNumber", weight: 0.4 },
      { name: "billTitle", weight: 0.3 },
      { name: "memberName", weight: 0.25 },
      { name: "hearingTitle", weight: 0.25 },
      { name: "committeeName", weight: 0.2 },
      { name: "label", weight: 0.2 },
      { name: "subtitle", weight: 0.15 },
      { name: "searchText", weight: 0.1 },
    ],
  });
}
