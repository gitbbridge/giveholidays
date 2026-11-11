import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    fs:{strict:true,deny:['.env','.env.*','**/*.{crt,pem,key,pfx}','**/.git/**','**/.local/**','**/GiveHolidays_CARA_Approved_Requirements.txt','**/private/**','**/server/**','**/build/**','**/docs/**']},
    proxy: { '/api': 'http://127.0.0.1:3001','^/(cara|admin|private-assets)(/|$)':'http://127.0.0.1:3001' },
  },
});
