"use client";

import { FEATURE_FLAGS } from '@/src/config/featureFlags';
import { ReactArtifactLegacy } from './ReactArtifactLegacy';
import ArtifactRendererWrapper from '@/src/components/renderer/ArtifactRendererWrapper';

export type Props = {
  code: string;
  mode: "preview" | "code";
  recording: boolean;
  onCapture: (params: { selectionImg: string; artifactImg: string }) => void;
  artifactId?: string;
};

export const ReactArtifact = (props: Props) => {
  if (FEATURE_FLAGS.OPTIMIZED_RENDERER) {
    return <ArtifactRendererWrapper {...props} type="react" />;
  }
  return <ReactArtifactLegacy {...props} />;
};
