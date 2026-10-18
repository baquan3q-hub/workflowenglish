import { computeRms, FRAME_MS } from './fluencyLogic';

/**
 * Levels of a recorded answer, one RMS value per 50 ms frame, or null when the
 * browser cannot decode the recording (fluency then skips pauses).
 */
export async function audioLevels(blob: Blob, frameMs = FRAME_MS): Promise<number[] | null> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx || !blob.size) return null;
  const ctx = new Ctx();
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    let mono = channels[0];
    if (channels.length > 1) {
      mono = new Float32Array(buffer.length);
      for (const ch of channels) for (let i = 0; i < ch.length; i++) mono[i] += ch[i] / channels.length;
    }
    return computeRms(mono, buffer.sampleRate, frameMs);
  } catch (err) {
    console.warn('audioLevels: could not decode recording', err);
    return null;
  } finally {
    void ctx.close();
  }
}
