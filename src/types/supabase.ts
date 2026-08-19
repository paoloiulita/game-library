export type Database = {
  public: {
    Tables: {
      games: {
        Row: {
          ID: string;
          Title: string | null;
          State: string | null;
          IsWishlist: boolean | null;
          user_id: string;
        };
        Insert: {
          ID?: string;
          Title?: string | null;
          State?: string | null;
          IsWishlist?: boolean | null;
          user_id?: string;
        };
        Update: {
          ID?: string;
          Title?: string | null;
          State?: string | null;
          IsWishlist?: boolean | null;
          user_id?: string;
        };
        Relationships: [];
      };
      stores: {
        Row: {
          ID: string;
          Name: string | null;
          user_id: string;
        };
        Insert: {
          ID?: string;
          Name?: string | null;
          user_id?: string;
        };
        Update: {
          ID?: string;
          Name?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      game_store: {
        Row: {
          GameID: string | null;
          StoreID: string | null;
          user_id: string;
        };
        Insert: {
          GameID?: string | null;
          StoreID?: string | null;
          user_id?: string;
        };
        Update: {
          GameID?: string | null;
          StoreID?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
