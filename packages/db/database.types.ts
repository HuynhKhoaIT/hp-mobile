// Placeholder cho tới migration đầu tiên. File này sẽ bị ghi đè bởi `supabase gen types typescript --local`.
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
