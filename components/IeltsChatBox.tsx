import React, { useState } from 'react';
import { FloatingChatBubble } from './ai-scaffold/FloatingChatBubble';
import { ScaffoldWindow } from './ai-scaffold/ScaffoldWindow';
import { getPhaseContextTip } from '../services/scaffoldChatService';

export interface IeltsChatBoxProps {
  darkMode: boolean;
  currentUser?: { id: string; email?: string } | null;
  currentPhase?: string;
  targetBand?: number;
}

/**
 * IELTS AI ChatBox / Learning Scaffold Component
 *
 * Upgraded to an omni-present learning companion with:
 * 1. Draggable floating bubble with magnetic edge snapping & position memory.
 * 2. Multi-mode window (floating, docked sidebar, fullscreen).
 * 3. Multimodal & document ingestion (images, audio recording, files).
 * 4. Deep sentence-by-sentence breakdown with grammar & nuance notes.
 * 5. Vocabulary extraction with 1-click SRS save to word mastery.
 * 6. Interactive practice & quiz cards directly inside chat.
 */
export default function IeltsChatBox({
  darkMode,
  currentUser,
  currentPhase,
  targetBand,
}: IeltsChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);

  const contextTip = getPhaseContextTip(currentPhase);

  return (
    <>
      {!isOpen ? (
        <FloatingChatBubble
          onOpen={() => setIsOpen(true)}
          contextBadge={contextTip?.badge}
        />
      ) : (
        <ScaffoldWindow
          darkMode={darkMode}
          onClose={() => setIsOpen(false)}
          currentUser={currentUser}
          currentPhase={currentPhase}
          targetBand={targetBand}
        />
      )}
    </>
  );
}
