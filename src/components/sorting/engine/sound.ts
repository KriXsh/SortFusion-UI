/**
 * Optional sonification: each compare, swap or write plays a short blip whose
 * pitch follows the bar's height. Created lazily on a user gesture, since
 * browsers keep an AudioContext suspended until then.
 */
export class Tone {
  private ctx: AudioContext | null = null;

  enable() {
    this.ctx ??= new AudioContext();
    void this.ctx.resume();
  }

  /** t in 0-1: low bars hum, tall bars ping. */
  play(t: number, length = 0.08) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 160 + t * 900;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + length + 0.02);
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
