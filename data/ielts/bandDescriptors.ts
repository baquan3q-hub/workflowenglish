/**
 * IELTS band descriptors for Writing and Speaking, bands 5–8, paraphrased in
 * Vietnamese for learners (not the official wording). Each band also says
 * what to work on to reach the next one; feedback screens show that line
 * under the AI's criterion score.
 */

export type DescriptorSkill = 'writing' | 'speaking';
export type DescriptorBand = 5 | 6 | 7 | 8;

export interface CriterionDescriptor {
  id: string;
  skill: DescriptorSkill;
  name: string;
  nameVi: string;
  /** Lower-case fragments matched against the criterion name the AI returns. */
  match: string[];
  /** One line: what the examiner looks at. */
  focus: string;
  bands: Record<DescriptorBand, string>;
  /** What to work on to move from this band to the next. */
  toNext: Record<DescriptorBand, string>;
}

export const DESCRIPTOR_BANDS: readonly DescriptorBand[] = [5, 6, 7, 8];

export const CRITERION_DESCRIPTORS: readonly CriterionDescriptor[] = [
  // ─── Writing ───────────────────────────────────────────────────────
  {
    id: 'wr_ta',
    skill: 'writing',
    name: 'Task Achievement',
    nameVi: 'Hoàn thành yêu cầu (Task 1)',
    match: ['task achievement'],
    focus: 'Có overview không, chọn đúng đặc điểm chính và so sánh số liệu hợp lý không.',
    bands: {
      5: 'Liệt kê số liệu máy móc, thiếu overview hoặc overview mờ; có thể sai hoặc thiếu số liệu quan trọng.',
      6: 'Có overview nhưng chưa nêu trúng xu hướng chính; số liệu chọn chưa thật tiêu biểu.',
      7: 'Overview rõ về xu hướng và đặc điểm nổi bật; số liệu được chọn lọc và so sánh hợp lý.',
      8: 'Bao quát đủ các đặc điểm chính, so sánh sắc nét, số liệu chính xác và đúng trọng tâm.',
    },
    toNext: {
      5: 'Viết 1–2 câu overview nêu xu hướng lớn nhất (không kèm số liệu) ngay sau mở bài.',
      6: 'Gom số liệu theo nhóm xu hướng rồi so sánh, thay vì đi lần lượt từng con số.',
      7: 'Không bỏ sót ngoại lệ đáng chú ý; mỗi số liệu đưa ra đều phục vụ một phép so sánh.',
      8: 'Giữ độ chính xác tuyệt đối và trình bày mọi đặc điểm chính một cách tinh gọn.',
    },
  },
  {
    id: 'wr_tr',
    skill: 'writing',
    name: 'Task Response',
    nameVi: 'Trả lời yêu cầu đề (Task 2)',
    match: ['task response'],
    focus: 'Trả lời đủ các phần của đề chưa, quan điểm có rõ và ý có được phát triển không.',
    bands: {
      5: 'Chỉ trả lời một phần đề; quan điểm chưa rõ hoặc thay đổi giữa bài; ý sơ sài, ví dụ ít hoặc lạc đề.',
      6: 'Trả lời đủ các phần của đề; có quan điểm nhưng kết luận có thể chưa rõ; vài ý chưa giải thích đủ.',
      7: 'Trả lời trọn vẹn đề; quan điểm rõ xuyên suốt; ý chính được mở rộng có ví dụ, đôi chỗ còn chung chung.',
      8: 'Trả lời đầy đủ và sâu; ý được phát triển tốt với ví dụ thuyết phục, hầu như không có ý thừa.',
    },
    toNext: {
      5: 'Gạch chân mọi câu hỏi trong đề và trả lời đủ; nêu quan điểm ở mở bài và giữ nguyên đến kết bài.',
      6: 'Mỗi đoạn thân bài một ý chính: nêu ý, giải thích "vì sao", rồi đưa ví dụ cụ thể.',
      7: 'Đào sâu ý bằng hệ quả, điều kiện hoặc phản biện; cắt câu không phục vụ lập luận.',
      8: 'Mọi luận điểm đều được chứng minh trọn vẹn, lập luận chặt chẽ và tinh tế.',
    },
  },
  {
    id: 'wr_cc',
    skill: 'writing',
    name: 'Coherence and Cohesion',
    nameVi: 'Mạch lạc và liên kết',
    match: ['coherence and cohesion', 'coherence'],
    focus: 'Bố cục, cách chia đoạn và cách các câu, các ý nối với nhau.',
    bands: {
      5: 'Có sắp xếp nhưng liên kết máy móc; từ nối thiếu, thừa hoặc sai; chia đoạn chưa hợp lý.',
      6: 'Bố cục rõ, có từ nối nhưng hay lặp hoặc gượng; đại từ thay thế (this, it, they) đôi khi chưa rõ.',
      7: 'Ý được sắp xếp logic và tiến triển rõ; dùng nhiều cách liên kết, đôi chỗ dùng quá tay.',
      8: 'Liên kết tự nhiên, chia đoạn hợp lý; người đọc theo dõi dễ dàng.',
    },
    toNext: {
      5: 'Mỗi đoạn có câu chủ đề rõ; dùng đúng các từ nối cơ bản (however, therefore, for example).',
      6: 'Bớt mở câu bằng "Firstly / Moreover"; nối ý bằng từ thay thế như "this trend", "such policies".',
      7: 'Liên kết bằng ý: câu sau phát triển tiếp câu trước, không chỉ dựa vào từ nối.',
      8: 'Giữ liên kết "vô hình": mạch văn trôi chảy mà không gây chú ý vào từ nối.',
    },
  },
  {
    id: 'wr_lr',
    skill: 'writing',
    name: 'Lexical Resource',
    nameVi: 'Vốn từ vựng',
    match: ['lexical resource', 'lexical'],
    focus: 'Độ rộng, độ chính xác của từ, collocation, chính tả và dạng từ.',
    bands: {
      5: 'Vốn từ hạn chế, lặp từ nhiều; lỗi chính tả và dạng từ đôi khi gây khó hiểu.',
      6: 'Đủ từ để diễn đạt; có thử từ ít phổ biến nhưng hay sai collocation hoặc dạng từ.',
      7: 'Dùng được từ ít phổ biến và collocation phù hợp; còn vài lỗi chọn từ.',
      8: 'Vốn từ rộng, chính xác và tự nhiên; lỗi hiếm và rất nhỏ.',
    },
    toNext: {
      5: 'Học từ theo chủ đề kèm collocation; soát chính tả và dạng từ (economy / economic).',
      6: 'Paraphrase đề bằng từ đồng nghĩa; học cả cụm như "pose a threat to" thay vì từ đơn lẻ.',
      7: 'Chọn từ đúng sắc thái theo ngữ cảnh; tránh dùng từ "học thuật" không đúng chỗ.',
      8: 'Dùng từ tinh tế, giàu sắc thái mà vẫn tự nhiên.',
    },
  },
  {
    id: 'wr_gra',
    skill: 'writing',
    name: 'Grammatical Range and Accuracy',
    nameVi: 'Ngữ pháp: đa dạng và chính xác',
    match: ['grammatical range', 'grammar'],
    focus: 'Mức độ đa dạng của cấu trúc câu và tỉ lệ câu không mắc lỗi.',
    bands: {
      5: 'Chủ yếu câu đơn; câu phức thường sai; lỗi nhiều, đôi khi gây khó hiểu.',
      6: 'Kết hợp câu đơn và câu phức; còn lỗi nhưng hiếm khi làm khó hiểu.',
      7: 'Dùng nhiều cấu trúc phức; phần lớn câu không lỗi, chỉ còn vài lỗi nhỏ.',
      8: 'Cấu trúc đa dạng, đa số câu hoàn toàn đúng; lỗi rất hiếm.',
    },
    toNext: {
      5: 'Chắc phần nền: chia thì, số ít/số nhiều, mạo từ a/an/the, chủ ngữ – động từ.',
      6: 'Thêm mệnh đề quan hệ, câu điều kiện, bị động; dành 3 phút cuối soát lỗi.',
      7: 'Tăng tỉ lệ câu không lỗi; đa dạng cấu trúc (mệnh đề phân từ, đảo ngữ nhẹ) mà không gượng.',
      8: 'Duy trì độ chính xác gần như tuyệt đối trên mọi cấu trúc.',
    },
  },

  // ─── Speaking ──────────────────────────────────────────────────────
  {
    id: 'sp_fc',
    skill: 'speaking',
    name: 'Fluency and Coherence',
    nameVi: 'Trôi chảy và mạch lạc',
    match: ['fluency'],
    focus: 'Nói dài được không, ngập ngừng nhiều không, các ý có nối với nhau không.',
    bands: {
      5: 'Nói được nhưng ngập ngừng, lặp từ, tự sửa nhiều; câu trả lời ngắn; từ nối đơn giản.',
      6: 'Sẵn sàng nói dài nhưng đôi lúc mất mạch vì ngập ngừng; từ nối chưa luôn phù hợp.',
      7: 'Nói dài dễ dàng, ít ngập ngừng; dùng từ nối và discourse markers linh hoạt.',
      8: 'Trôi chảy; chỉ ngập ngừng khi nghĩ ý, không phải khi tìm từ; mạch lạc.',
    },
    toNext: {
      5: 'Trả lời Part 1 bằng 2–3 câu (ý chính, lý do, ví dụ); thay "um" bằng "Well, let me think…".',
      6: 'Luyện nói liên tục đủ 2 phút ở Part 2; dùng "actually", "to be honest", "what I mean is".',
      7: 'Khi ngập ngừng là đang nghĩ ý, không phải thiếu từ; mở rộng ý tự nhiên ở Part 3.',
      8: 'Giữ mạch nói tự nhiên ngay cả với câu hỏi trừu tượng, khó.',
    },
  },
  {
    id: 'sp_lr',
    skill: 'speaking',
    name: 'Lexical Resource',
    nameVi: 'Vốn từ vựng',
    match: ['lexical resource', 'lexical'],
    focus: 'Vốn từ theo chủ đề, khả năng paraphrase, idiom và collocation.',
    bands: {
      5: 'Nói được chủ đề quen thuộc nhưng vốn từ hạn chế; khó diễn đạt lại khi bí từ.',
      6: 'Đủ từ để nói dài về nhiều chủ đề; có paraphrase nhưng đôi lúc dùng sai.',
      7: 'Dùng từ linh hoạt, có idiom và collocation tự nhiên, đôi chỗ chưa thật chính xác.',
      8: 'Vốn từ phong phú, idiom dùng tự nhiên, paraphrase hiệu quả.',
    },
    toNext: {
      5: 'Học từ theo gói chủ đề Part 1 (quê, công việc, sở thích…), mỗi từ kèm một câu ví dụ của bạn.',
      6: 'Khi bí từ hãy diễn giải ("the thing you use to…") thay vì dừng lại.',
      7: 'Dùng collocation chính xác hơn và một vài idiom phù hợp ngữ cảnh, không gượng ép.',
      8: 'Chọn từ giàu sắc thái, chuyển giọng trang trọng – thân mật linh hoạt.',
    },
  },
  {
    id: 'sp_gra',
    skill: 'speaking',
    name: 'Grammatical Range and Accuracy',
    nameVi: 'Ngữ pháp: đa dạng và chính xác',
    match: ['grammatical range', 'grammar'],
    focus: 'Cấu trúc câu khi nói và mức độ chính xác.',
    bands: {
      5: 'Câu đơn là chính; câu phức ít và hay sai; lỗi thì, số nhiều thường xuyên.',
      6: 'Kết hợp câu đơn và phức; còn lỗi nhưng ít khi gây hiểu nhầm.',
      7: 'Dùng nhiều cấu trúc phức khá linh hoạt; nhiều câu không lỗi.',
      8: 'Cấu trúc đa dạng, phần lớn câu đúng; lỗi nhỏ và hiếm.',
    },
    toNext: {
      5: 'Để ý thì khi kể chuyện quá khứ ở Part 2 và đuôi -s của động từ ngôi thứ ba.',
      6: 'Dùng câu điều kiện, mệnh đề quan hệ, so sánh khi trả lời Part 3.',
      7: 'Giảm lỗi lặp lại; thử cấu trúc như "What I like most is…", "Had I known…".',
      8: 'Giữ độ chính xác khi nói nhanh và khi bàn chủ đề trừu tượng.',
    },
  },
  {
    id: 'sp_pr',
    skill: 'speaking',
    name: 'Pronunciation',
    nameVi: 'Phát âm',
    match: ['pronunciation'],
    focus: 'Âm, trọng âm, ngữ điệu, nối âm và độ dễ hiểu tổng thể.',
    bands: {
      5: 'Có lúc khó hiểu; mất âm cuối, sai trọng âm và ngữ điệu đều đều.',
      6: 'Nhìn chung hiểu được; còn lỗi âm cuối, một số âm khó và ngữ điệu chưa tự nhiên.',
      7: 'Dễ hiểu; có trọng âm câu và ngữ điệu; lỗi nhỏ không ảnh hưởng.',
      8: 'Rõ ràng suốt bài; ngữ điệu, nối âm tự nhiên; giọng mẹ đẻ ít ảnh hưởng.',
    },
    toNext: {
      5: 'Luyện âm cuối /s/ /z/ /t/ /d/, đuôi -ed và trọng âm của các từ hay dùng.',
      6: 'Nhấn vào từ mang nghĩa trong câu; luyện nối âm (pick it up) và shadowing bài mẫu.',
      7: 'Chia câu theo cụm ý (chunking), lên xuống giọng tự nhiên khi liệt kê, hỏi lại, nhấn mạnh.',
      8: 'Giữ độ rõ ràng và tự nhiên ổn định từ đầu đến cuối bài.',
    },
  },
];

/** The descriptor band for a score: floored to a whole band, clamped to 5–8. */
export function descriptorBand(score: number): DescriptorBand {
  const b = Math.floor(Number.isFinite(score) ? score : 5);
  return Math.min(8, Math.max(5, b)) as DescriptorBand;
}

/** The descriptor for an AI criterion name ("Task Response", "Pronunciation", …). */
export function findDescriptor(skill: DescriptorSkill, criterionName: string): CriterionDescriptor | undefined {
  const name = criterionName.trim().toLowerCase();
  if (!name) return undefined;
  return CRITERION_DESCRIPTORS.find((d) => d.skill === skill && d.match.some((m) => name.includes(m)));
}
