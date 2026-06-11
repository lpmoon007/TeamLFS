'use client';
import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getBrowserClient } from '@/lib/supabase/browser';

// The participant subscribes to ONE Realtime channel per seat. Later phases'
// server code (fire-inject, send-message, deliver-email) broadcast onto this same
// channel, so the read path stays live without exposing privileged table reads to
// the anon client. Presence on the channel drives the online dots.
//
//   channel: signal:session:<sessionId>:seat:<seatKey>
//   events:  'message' | 'email' | 'call' | 'situation' | 'inject'

export type RealtimeEvent =
  | { event: 'message'; payload: any }
  | { event: 'email'; payload: any }
  | { event: 'call'; payload: any }
  | { event: 'situation'; payload: any }
  | { event: 'inject'; payload: any };

export interface PresenceState {
  /** seat keys currently online (including self once tracked). */
  online: Set<string>;
}

export function channelName(sessionId: string, seatKey: string): string {
  return `signal:session:${sessionId}:seat:${seatKey}`;
}

export function useParticipantChannel(opts: {
  sessionId: string;
  seatKey: string;
  enabled: boolean;
  onEvent?: (evt: RealtimeEvent) => void;
}) {
  const { sessionId, seatKey, enabled, onEvent } = opts;
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const chanRef = useRef<RealtimeChannel | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;
    const supabase = getBrowserClient();
    const name = channelName(sessionId, seatKey);
    const channel = supabase.channel(name, {
      config: { presence: { key: seatKey }, broadcast: { self: false } },
    });
    chanRef.current = channel;

    const forward = (event: RealtimeEvent['event']) =>
      channel.on('broadcast', { event }, ({ payload }) =>
        onEventRef.current?.({ event, payload } as RealtimeEvent),
      );
    forward('message');
    forward('email');
    forward('call');
    forward('situation');
    forward('inject');

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setOnline(new Set(Object.keys(state)));
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true);
        await channel.track({ seat: seatKey, at: Date.now() });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setConnected(false);
      }
    });

    return () => {
      setConnected(false);
      supabase.removeChannel(channel);
      chanRef.current = null;
    };
  }, [enabled, sessionId, seatKey]);

  return { online, connected };
}
