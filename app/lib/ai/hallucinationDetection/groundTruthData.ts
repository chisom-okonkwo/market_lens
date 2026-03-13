/**
 * Local ground-truth fact store for hallucination detection.
 *
 * Facts are grouped by category for readability.
 *
 * HOW TO REPLACE LATER:
 *   Replace the GROUND_TRUTH_FACTS constant (or the body of getGroundTruth)
 *   with a call to a database, product catalog API, or scraped data loader.
 *   The rest of the pipeline consumes GroundTruthEntry[], so the interface
 *   at the call site stays exactly the same.
 */

import { type GroundTruthEntry } from "@/lib/ai/hallucinationDetection/types";

export type GroundTruthCategory =
  | "ebay-platform"
  | "product"
  | "retailer"
  | "financial";

export interface GroundTruthFact extends GroundTruthEntry {
  category: GroundTruthCategory;
}

// ---------------------------------------------------------------------------
// Static fact store — swap this out when you have a real catalog or database.
// ---------------------------------------------------------------------------
export const GROUND_TRUTH_FACTS: GroundTruthFact[] = [
  // -- eBay platform facts --------------------------------------------------
  {
    value: "eBay is an online marketplace",
    category: "ebay-platform",
    sourceReference: "ebay.com/about",
  },
  {
    value: "eBay lets buyers and sellers transact on a single platform",
    category: "ebay-platform",
    sourceReference: "ebay.com/about",
  },
  {
    value: "eBay sells DeWalt DCD771",
    category: "ebay-platform",
    sourceReference: "ebay.com/sch/DeWalt-DCD771",
  },
  {
    value: "DeWalt DCD771 is available on eBay",
    category: "ebay-platform",
    sourceReference: "ebay.com/sch/DeWalt-DCD771",
  },
  {
    value: "eBay sells Bosch drills",
    category: "ebay-platform",
    sourceReference: "ebay.com/sch/Bosch-drills",
  },
  {
    value: "eBay sells Ryobi power tools",
    category: "ebay-platform",
    sourceReference: "ebay.com/sch/Ryobi",
  },
  {
    value: "eBay offers buyer protection on eligible purchases",
    category: "ebay-platform",
    sourceReference: "ebay.com/help/buying/buyer-protection",
  },

  // -- Product facts --------------------------------------------------------
  {
    value: "DeWalt DCD771 is a cordless drill",
    category: "product",
    sourceReference: "dewalt.com/products/power-tools/drills/DCD771",
  },
  {
    value: "DeWalt DCD771 is sold by Home Depot",
    category: "product",
    sourceReference: "homedepot.com/p/DeWalt-DCD771",
  },
  {
    value: "Bosch GSB 13 RE is a corded drill",
    category: "product",
    sourceReference: "bosch-professional.com/products/GSB-13-RE",
  },

  // -- Retailer facts -------------------------------------------------------
  {
    value: "Home Depot sells Bosch drills",
    category: "retailer",
    sourceReference: "homedepot.com/b/Bosch",
  },
  {
    value: "Home Depot sells DeWalt power tools",
    category: "retailer",
    sourceReference: "homedepot.com/b/DeWalt",
  },
  {
    value: "Amazon sells Ryobi tools",
    category: "retailer",
    sourceReference: "amazon.com/ryobi-tools",
  },

  // -- Financial facts ------------------------------------------------------
  {
    value: "Capital One Venture earns 2x miles per dollar",
    category: "financial",
    sourceReference: "capitalone.com/credit-cards/venture",
  },
  {
    value: "Capital One Venture card has no foreign transaction fees",
    category: "financial",
    sourceReference: "capitalone.com/credit-cards/venture",
  },
];

// ---------------------------------------------------------------------------
// Accessor — this is the only function the rest of the app should call.
// Replace the body here (e.g. with a DB query) without touching callers.
// ---------------------------------------------------------------------------
export function getGroundTruth(): GroundTruthEntry[] {
  return GROUND_TRUTH_FACTS;
}

export function getGroundTruthByCategory(
  category: GroundTruthCategory,
): GroundTruthEntry[] {
  return GROUND_TRUTH_FACTS.filter((fact) => fact.category === category);
}
