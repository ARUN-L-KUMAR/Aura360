export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string | null
          category: string | null
          tags: string[] | null
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content?: string | null
          category?: string | null
          tags?: string[] | null
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string | null
          category?: string | null
          tags?: string[] | null
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      finances: {
        Row: {
          id: string
          user_id: string
          type: "income" | "expense" | "investment"
          amount: number
          category: string
          description: string | null
          date: string
          needs_review: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: "income" | "expense" | "investment"
          amount: number
          category: string
          description?: string | null
          date: string
          needs_review?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: "income" | "expense" | "investment"
          amount?: number
          category?: string
          description?: string | null
          date?: string
          needs_review?: boolean
          created_at?: string
          updated_at?: string
        }
        fashion: {
          Row: {
            id: string
            user_id: string
            item_name: string
            category: string
            brand: string | null
            color: string | null
            size: string | null
            purchase_date: string | null
            price: number | null
            image_url: string | null
            buying_link: string | null
            notes: string | null
            type: "buyed" | "need_to_buy"
            status: string | null
            occasion: string[] | null
            season: string[] | null
            expected_budget: number | null
            buy_deadline: string | null
            is_favorite: boolean
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            user_id: string
            item_name: string
            category: string
            brand?: string | null
            color?: string | null
            size?: string | null
            purchase_date?: string | null
            price?: number | null
            image_url?: string | null
            buying_link?: string | null
            notes?: string | null
            type?: "buyed" | "need_to_buy"
            status?: string | null
            occasion?: string[] | null
            season?: string[] | null
            expected_budget?: number | null
            buy_deadline?: string | null
            is_favorite?: boolean
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            user_id?: string
            item_name?: string
            category?: string
            brand?: string | null
            color?: string | null
            size?: string | null
            purchase_date?: string | null
            price?: number | null
            image_url?: string | null
            buying_link?: string | null
            notes?: string | null
            type?: "buyed" | "need_to_buy"
            status?: string | null
            occasion?: string[] | null
            season?: string[] | null
            expected_budget?: number | null
            buy_deadline?: string | null
            is_favorite?: boolean
            created_at?: string
            updated_at?: string
          }
        }
      }
    }
  }
}
