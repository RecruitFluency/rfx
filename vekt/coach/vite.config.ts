import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The sport catalog and report logic live with the functions (../supabase/functions/_shared)
// so the app and the backend always agree; let Vite read them.
export default defineConfig({ plugins: [react()], server: { fs: { allow: [".."] } } });
