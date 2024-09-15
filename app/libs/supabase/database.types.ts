export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      Brand: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      Category: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string
          parentId: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name: string
          parentId?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          parentId?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "Category_parentId_fkey"
            columns: ["parentId"]
            isOneToOne: false
            referencedRelation: "Category"
            referencedColumns: ["id"]
          },
        ]
      }
      Image: {
        Row: {
          id: number
          location: string
        }
        Insert: {
          id?: number
          location: string
        }
        Update: {
          id?: number
          location?: string
        }
        Relationships: []
      }
      Product: {
        Row: {
          brandId: number | null
          categoryId: number | null
          created_at: string
          description: string | null
          id: number
          imageId: number | null
          model: string | null
          name: string
          shortDescription: string | null
          viewCount: number
          visible: boolean
        }
        Insert: {
          brandId?: number | null
          categoryId?: number | null
          created_at?: string
          description?: string | null
          id?: number
          imageId?: number | null
          model?: string | null
          name: string
          shortDescription?: string | null
          viewCount?: number
          visible?: boolean
        }
        Update: {
          brandId?: number | null
          categoryId?: number | null
          created_at?: string
          description?: string | null
          id?: number
          imageId?: number | null
          model?: string | null
          name?: string
          shortDescription?: string | null
          viewCount?: number
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "Product_brandId_fkey"
            columns: ["brandId"]
            isOneToOne: false
            referencedRelation: "Brand"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Product_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "Category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Product_imageId_fkey"
            columns: ["imageId"]
            isOneToOne: false
            referencedRelation: "Image"
            referencedColumns: ["id"]
          },
        ]
      }
      ProductSpec: {
        Row: {
          created_at: string
          id: number
          name: string
          product_id: number
          value: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          product_id: number
          value: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          product_id?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "ProductSpec_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "Product"
            referencedColumns: ["id"]
          },
        ]
      }
      Showcase: {
        Row: {
          created_at: string
          description: string | null
          id: number
          imageId: number | null
          name: string
          viewCount: number
          visible: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          imageId?: number | null
          name: string
          viewCount?: number
          visible?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          imageId?: number | null
          name?: string
          viewCount?: number
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "Showcase_imageId_fkey"
            columns: ["imageId"]
            isOneToOne: false
            referencedRelation: "Image"
            referencedColumns: ["id"]
          },
        ]
      }
      ShowcaseProduct: {
        Row: {
          id: number
          productId: number
          showcaseId: number
        }
        Insert: {
          id?: number
          productId: number
          showcaseId: number
        }
        Update: {
          id?: number
          productId?: number
          showcaseId?: number
        }
        Relationships: [
          {
            foreignKeyName: "ShowcaseProduct_productId_fkey"
            columns: ["productId"]
            isOneToOne: false
            referencedRelation: "Product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ShowcaseProduct_showcaseId_fkey"
            columns: ["showcaseId"]
            isOneToOne: false
            referencedRelation: "Showcase"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
