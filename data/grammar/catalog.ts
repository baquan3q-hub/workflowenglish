import type { GrammarLesson } from './types';

export const units = [
  'Dựng câu đầu tiên',
  'Hỏi và trả lời',
  'Nói về người và vật',
  'Thói quen và việc đang diễn ra',
  'Kể chuyện quá khứ',
  'Kế hoạch, so sánh và nối ý',
];
export const curriculum = [
  {
    id: 'be',
    title: 'Giới thiệu bằng am, is, are',
    goal: 'Giới thiệu tên, nghề và trạng thái của một người.',
    group: 1,
  },
  {
    id: 'subject',
    title: 'Chọn đại từ làm chủ ngữ',
    goal: 'Thay tên người hoặc vật bằng đại từ thích hợp.',
    group: 1,
  },
  {
    id: 'verb',
    title: 'Câu với động từ chỉ hành động',
    goal: 'Kể một hoạt động quen thuộc bằng chủ ngữ và động từ.',
    group: 1,
  },
  {
    id: 'order',
    title: 'Sắp xếp từ thành câu',
    goal: 'Đặt người thực hiện, hành động và đối tượng theo đúng thứ tự.',
    group: 1,
  },
  {
    id: 'be-question',
    title: 'Hỏi và phủ định với be',
    goal: 'Hỏi thông tin đơn giản và nói điều gì chưa đúng.',
    group: 2,
  },
  {
    id: 'do-question',
    title: 'Hỏi về thói quen với do và does',
    goal: 'Hỏi người khác thường làm gì.',
    group: 2,
  },
  {
    id: 'negative',
    title: 'Nói điều mình không làm',
    goal: "Phủ định thói quen bằng don't và doesn't.",
    group: 2,
  },
  {
    id: 'wh',
    title: 'Hỏi ai, ở đâu, khi nào và vì sao',
    goal: 'Chọn từ để hỏi đúng thông tin cần biết.',
    group: 2,
  },
  {
    id: 'articles',
    title: 'Chọn a, an và the',
    goal: 'Giới thiệu một vật và nhắc lại vật đã xác định.',
    group: 3,
  },
  {
    id: 'plural',
    title: 'Số nhiều và lượng từ',
    goal: 'Nói số lượng người, đồ vật và chất liệu.',
    group: 3,
  },
  {
    id: 'possessive',
    title: 'Nói đồ vật thuộc về ai',
    goal: 'Liên kết người sở hữu với đồ vật.',
    group: 3,
  },
  {
    id: 'location',
    title: 'Mô tả nơi chốn với there is và there are',
    goal: 'Nói ở một nơi có gì và vật đó nằm ở đâu.',
    group: 3,
  },
  {
    id: 'agreement',
    title: 'Chia động từ theo chủ ngữ',
    goal: 'Kể thói quen của một hoặc nhiều người.',
    group: 4,
  },
  {
    id: 'frequency',
    title: 'Nói mức độ thường xuyên',
    goal: 'Đặt trạng từ tần suất vào câu kể thói quen.',
    group: 4,
  },
  {
    id: 'continuous',
    title: 'Diễn tả việc đang xảy ra',
    goal: 'Nói về hành động đang diễn ra tại lúc nói.',
    group: 4,
  },
  {
    id: 'ability',
    title: 'Diễn đạt khả năng và lời yêu cầu',
    goal: 'Dùng can để nói khả năng và nhờ giúp đỡ.',
    group: 4,
  },
  {
    id: 'was-were',
    title: 'Nói về trạng thái trong quá khứ',
    goal: 'Dùng was và were để kể mình đã ở đâu hoặc cảm thấy thế nào.',
    group: 5,
  },
  {
    id: 'past',
    title: 'Kể việc đã xảy ra',
    goal: 'Dùng quá khứ đơn để kể một việc đã kết thúc.',
    group: 5,
  },
  {
    id: 'past-question',
    title: 'Hỏi và phủ định trong quá khứ',
    goal: 'Hỏi chi tiết và phủ định một việc đã xảy ra.',
    group: 5,
  },
  {
    id: 'past-continuous',
    title: 'Kể việc đang diễn ra thì việc khác xảy ra',
    goal: 'Phân biệt bối cảnh đang diễn ra với sự việc xen vào.',
    group: 5,
  },
  {
    id: 'future',
    title: 'Nói về dự định',
    goal: 'Trình bày kế hoạch đã có bằng be going to.',
    group: 6,
  },
  {
    id: 'compare',
    title: 'So sánh hai lựa chọn',
    goal: 'So sánh người, nơi hoặc đồ vật bằng tính từ.',
    group: 6,
  },
  {
    id: 'connect',
    title: 'Nối lý do, kết quả và ý tương phản',
    goal: 'Liên kết hai ý để giải thích một lựa chọn.',
    group: 6,
  },
  {
    id: 'experience',
    title: 'Nói về trải nghiệm đã có',
    goal: 'Hỏi về trải nghiệm và phân biệt với thời điểm đã kết thúc.',
    group: 6,
  },
];
/** Foundation skills are ordered: the preceding skill supplies the recommended prerequisite. */
export function prerequisite(id: string) {
  const index = curriculum.findIndex((s) => s.id === id);
  return index > 0 ? curriculum[index - 1] : null;
}
export const advanced = [
  {
    level: 'B1',
    before: 'Hoàn thành sáu cụm nền tảng',
    topics: 'Đối chiếu thì, động từ tình thái, điều kiện, mệnh đề quan hệ, bị động và tường thuật.',
    outcome: 'Kể trải nghiệm trong Speaking Part 2 và viết đoạn giải thích có ví dụ.',
  },
  {
    level: 'B2',
    before: 'Vận dụng được kiến thức B1',
    topics: 'Nhượng bộ, giả định, mở rộng cụm danh từ, mô tả quy trình và so sánh số liệu.',
    outcome: 'Phát triển lập luận Task 2, mô tả biểu đồ Task 1 và trả lời câu hỏi giả định.',
  },
  {
    level: 'C1',
    before: 'Vận dụng được kiến thức B2',
    topics: 'Thì và thể trong đoạn dài, mệnh đề phân từ, nhấn mạnh, mức độ chắc chắn và văn phong.',
    outcome: 'Diễn đạt cùng một ý khi nói và viết học thuật, tự sửa câu thiếu rõ ràng.',
  },
];
const loaders = [
  () => import('./unit1'),
  () => import('./unit2'),
  () => import('./unit3'),
  () => import('./unit4'),
  () => import('./unit5'),
  () => import('./unit6'),
];
export async function loadLessons(ids: string[]): Promise<GrammarLesson[]> {
  const groups = [...new Set(curriculum.filter((s) => ids.includes(s.id)).map((s) => s.group))];
  const packs = await Promise.all(groups.map((group) => loaders[group - 1]()));
  return packs.flatMap((pack) => pack.default).filter((s) => ids.includes(s.id));
}
