export interface RadioTrack {
  id: string;
  name: string;
  artist: string;
  duration: number;
}

export interface RadioPlaylist {
  id: string;
  name: string;
  sourceUrl: string;
  tracks: RadioTrack[];
}

export interface RadioPlayback {
  id: string;
  url: string;
  trial: boolean;
}
