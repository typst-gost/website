interface TypstCompilerOptions {
  getModule: string;
}

interface TypstRendererOptions {
  getModule: string;
}

interface TypstSvgOptions {
  mainFilePath: string;
}

interface TypstModule {
  setCompilerInitOptions(options: TypstCompilerOptions): void;
  setRendererInitOptions(options: TypstRendererOptions): void;
  mapShadow(path: string, data: Uint8Array): void;
  svg(options: TypstSvgOptions): Promise<string>;
}

interface Window {
  $typst?: TypstModule;
}
