export type JoinRecord = Record<string, unknown>;

export function createRemoteJoiner() {
  return {
    merge(left: JoinRecord, right: JoinRecord) {
      return {
        ...left,
        ...right,
      };
    },
  };
}
