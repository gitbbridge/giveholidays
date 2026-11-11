import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({root:resolve('private'),envDir:resolve('.'),base:'/private-assets/',publicDir:false,plugins:[react()],build:{outDir:resolve('build/private'),emptyOutDir:true}});
