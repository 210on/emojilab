const randomChunk = () => {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(36).padStart(6, '0')).join('');
};

export const createParticipantId = () => `p_${randomChunk().slice(0, 10)}`;

export const createSessionId = () => `s_${Date.now().toString(36)}_${randomChunk().slice(0, 8)}`;

export const createEventId = () => `e_${Date.now().toString(36)}_${randomChunk().slice(0, 8)}`;
