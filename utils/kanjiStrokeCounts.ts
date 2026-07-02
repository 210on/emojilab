const KANJI_STROKE_ENTRIES: Array<[string, number]> = [
  ['一', 1], ['二', 2], ['三', 3], ['了', 2], ['人', 2], ['入', 2], ['力', 2],
  ['七', 2], ['八', 2], ['九', 2], ['十', 2], ['上', 3], ['下', 3], ['土', 3],
  ['大', 3], ['小', 3], ['山', 3], ['川', 3], ['口', 3], ['子', 3], ['女', 3],
  ['丸', 3], ['士', 3], ['中', 4], ['月', 4], ['日', 4], ['木', 4], ['水', 4],
  ['火', 4], ['今', 4], ['友', 4], ['天', 4], ['心', 4], ['手', 4], ['文', 4],
  ['円', 4], ['分', 4], ['不', 4], ['本', 5], ['生', 5], ['目', 5], ['白', 5],
  ['左', 5], ['右', 5], ['北', 5], ['半', 5], ['古', 5], ['正', 5], ['可', 5],
  ['出', 5], ['田', 5], ['礼', 5], ['気', 6], ['先', 6], ['年', 6], ['字', 6],
  ['好', 6], ['耳', 6], ['名', 6], ['会', 6], ['休', 6], ['毎', 6], ['光', 6],
  ['地', 6], ['色', 6], ['全', 6], ['多', 6], ['早', 6], ['行', 6], ['良', 7],
  ['男', 7], ['足', 7], ['来', 7], ['見', 7], ['売', 7], ['作', 7], ['私', 7],
  ['君', 7], ['花', 7], ['赤', 7], ['社', 7], ['究', 7], ['完', 7], ['学', 8],
  ['使', 8], ['店', 8], ['東', 8], ['雨', 8], ['空', 8], ['青', 8], ['実', 8],
  ['承', 8], ['知', 8], ['刻', 8], ['金', 8], ['泣', 8], ['前', 9], ['後', 9],
  ['南', 9], ['食', 9], ['神', 9], ['風', 9], ['海', 9], ['星', 9], ['美', 9],
  ['怒', 9], ['草', 9], ['研', 9], ['発', 9], ['表', 8], ['高', 10], ['書', 10],
  ['俺', 10], ['時', 10], ['速', 10], ['弱', 10], ['疲', 10], ['起', 10],
  ['眠', 10], ['笑', 10], ['修', 10], ['院', 10], ['最', 12], ['飲', 12],
  ['買', 12], ['達', 12], ['遊', 12], ['悲', 12], ['短', 12], ['遅', 12],
  ['答', 12], ['無', 12], ['勝', 12], ['間', 12], ['楽', 13], ['話', 13],
  ['感', 13], ['愛', 13], ['解', 13], ['新', 13], ['頑', 13], ['寝', 13],
  ['薬', 16], ['語', 14], ['読', 14], ['認', 14], ['維', 14], ['罰', 14],
  ['様', 14], ['僕', 14], ['確', 15], ['線', 15], ['憂', 15], ['嬉', 15],
  ['論', 15], ['誰', 15], ['機', 16], ['薔', 16], ['薇', 16], ['頼', 16],
  ['優', 17], ['縮', 17], ['聴', 17], ['環', 17], ['闇', 17], ['謝', 17],
  ['観', 18], ['顔', 18], ['難', 18], ['瞬', 18], ['題', 18], ['験', 18],
  ['願', 19], ['識', 19], ['警', 19], ['麗', 19], ['瀬', 19], ['爆', 19],
  ['護', 20], ['議', 20], ['競', 20], ['響', 20], ['顧', 21], ['露', 21],
  ['魔', 21], ['驚', 22], ['鬱', 29],
];

const KANJI_STROKE_COUNTS = Object.fromEntries(KANJI_STROKE_ENTRIES);
const DENSE_KANJI_THRESHOLD = 14;
const CJK_UNIFIED_IDEOGRAPH_PATTERN = /[\u3400-\u9fff]/u;

export interface StrokeMetrics {
  totalStrokeCount: number;
  maxStrokeCount: number;
  denseKanjiCount: number;
  knownKanjiCount: number;
  unknownKanjiCount: number;
  kanjiCount: number;
}

export const getStrokeCount = (char: string) => KANJI_STROKE_COUNTS[char] ?? null;

export const getStrokeMetrics = (text: string): StrokeMetrics => {
  let totalStrokeCount = 0;
  let maxStrokeCount = 0;
  let denseKanjiCount = 0;
  let knownKanjiCount = 0;
  let unknownKanjiCount = 0;

  for (const char of [...text]) {
    if (!CJK_UNIFIED_IDEOGRAPH_PATTERN.test(char)) {
      continue;
    }

    const strokeCount = getStrokeCount(char);
    if (strokeCount == null) {
      unknownKanjiCount += 1;
      continue;
    }

    knownKanjiCount += 1;
    totalStrokeCount += strokeCount;
    maxStrokeCount = Math.max(maxStrokeCount, strokeCount);

    if (strokeCount >= DENSE_KANJI_THRESHOLD) {
      denseKanjiCount += 1;
    }
  }

  return {
    totalStrokeCount,
    maxStrokeCount,
    denseKanjiCount,
    knownKanjiCount,
    unknownKanjiCount,
    kanjiCount: knownKanjiCount + unknownKanjiCount,
  };
};
