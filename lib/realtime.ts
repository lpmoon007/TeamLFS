'use client';
import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getBrowserClient } from '@/lib/supabase/browser';
import { seatChannel, sessionPresenceChannel, sessionRoomChannel } from '@/lib/channels';

// Two channels per participant:
//  1. seat channel  — directed events (messages/emails/calls/injects) for THIS seat.
//     Later phases' server code broadcasts onto it (see lib/realtime-server.ts).
//  2. session presence channel — every seat joins it, so everyone sees who's online.
//     Presence isn't sensitive (just who's connected), so a session-wide channel is
//     fine; directed message payloads stay on the per-seat channels.

export type RealtimeEvent =
  | { event: 'message'; payload: any }
  | { event: 'email'; payload: any }
  | { event: 'call'; payload: any }
  | { event: 'situation'; payload: any }
  | { event: 'inject'; payload: any }
  | { event: 'curtain'; payload: any };

/** Subscribe to this seat's directed-event channel (keyed on the private channel_key). */
export function useParticipantChannel(opts: {
  sessionId: string;
  channelKey: string;
  enabled: boolean;
  onEvent?: (evt: RealtimeEvent) => void;
}) {
  const { sessionId, channelKey, enabled, onEvent } = opts;
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !channelKey) return;
    const supabase = getBrowserClient();
    const channel = supabase.channel(seatChannel(sessionId, channelKey), {
      config: { broadcast: { self: false } },
    });

    const forward = (event: RealtimeEvent['event']) =>
      channel.on('broadcast', { event }, ({ payload }) =>
        onEventRef.current?.({ event, payload } as RealtimeEvent),
      );
    forward('message');
    forward('email');
    forward('call');
    forward('situation');
    forward('inject');
    forward('curtain');

    channel.subscribe((status) => {
      setConnected(status === 'SUBSCRIBED');
    });

    return () => {
      setConnected(false);
      supabase.removeChannel(channel);
    };
  }, [enabled, sessionId, channelKey]);

  return { connected };
}

/** Subscribe to the session-wide room channel — shared deliberation signals (proposal /
 *  stance / decision_lock). Fires `onRoom` on any room event so the board can refetch. */
export function useRoomChannel(opts: { sessionId: string; enabled: boolean; onRoom?: (payload: any) => void }) {
  const { sessionId, enabled, onRoom } = opts;
  const onRoomRef = useRef(onRoom);
  onRoomRef.current = onRoom;

  useEffect(() => {
    if (!enabled) return;
    const supabase = getBrowserClient();
    const channel = supabase.channel(sessionRoomChannel(sessionId), { config: { broadcast: { self: false } } });
    channel.on('broadcast', { event: 'room' }, ({ payload }) => onRoomRef.current?.(payload));
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, sessionId]);
}

/**
 * Session-wide presence. Every participant tracks their seat here, so the returned
 * `online` set contains every currently-connected seat key (self + teammates) —
 * driving the online dots across the contact list.
 */
export function useSessionPresence(opts: {
  sessionId: string;
  seatKey: string;
  name?: string;
  enabled: boolean;
}) {
  const { sessionId, seatKey, name, enabled } = opts;
  const [online, setOnline] = useState<Set<string>>(new Set());
  const chanRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const supabase = getBrowserClient();
    const channel = supabase.channel(sessionPresenceChannel(sessionId), {
      config: { presence: { key: seatKey } },
    });
    chanRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      setOnline(new Set(Object.keys(channel.presenceState())));
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ seat: seatKey, name: name ?? seatKey, at: Date.now() });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      chanRef.current = null;
    };
  }, [enabled, sessionId, seatKey, name]);

  return { online };
}
