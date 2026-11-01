import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// esbuild는 데코레이터 메타데이터를 만들지 않으므로 NestJS 의존성 주입을 위해 SWC로 변환한다.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
