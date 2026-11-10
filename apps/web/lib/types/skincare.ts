export type RoutineTime = "morning" | "evening" | "both" | "weekly" | "optional";
export type SkincareStatus = "owned" | "need_to_buy" | "finished";
export type BodyPart = "face" | "hair" | "body" | "oral" | "general";

export interface SkincareProduct {
  id: string;
  workspaceId: string;
  userId: string;
  productName: string;
  brand: string | null;
  category: string;
  bodyPart: BodyPart;
  status: SkincareStatus;
  routineTime: RoutineTime | null;
  routineOrder: number | null;
  frequency: string | null;
  purchaseDate: string | null;
  expiryDate: string | null;
  price: string | null; // Drizzle decimal is returned as string
  rating: number | null;
  notes: string | null;
  imageUrl: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}
