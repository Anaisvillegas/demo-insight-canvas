"use client";

import { FEATURE_FLAGS } from '@/src/config/featureFlags';
import { HTMLArtifactLegacy } from './HTMLArtifactLegacy';
import ArtifactRendererWrapper from '@/src/components/renderer/ArtifactRendererWrapper';

export type Props = {
  code: string;
  mode: "preview" | "code";
  recording: boolean;
  onCapture: (params: { selectionImg: string; artifactImg: string }) => void;
};

export const HTMLArtifact = (props: Props) => {
  if (FEATURE_FLAGS.OPTIMIZED_RENDERER) {
    return <ArtifactRendererWrapper {...props} type="html" />;
  }
  return <HTMLArtifactLegacy {...props} />;
};
