/**
 * Numbers, names and dates drill: short clips like the ones in Part 1, where
 * most marks are lost to spelling. Written for this app. Each clip is read
 * once by TTS and cached for everyone, so the bank is fixed (not generated).
 */
import type { ListeningStyle, ListeningVoice } from '../../../services/listeningAudioService';

export type DrillCategory = 'names' | 'phone' | 'dates' | 'codes' | 'numbers';

export interface DrillItem {
  id: string;
  category: DrillCategory;
  /** What the learner writes down, in Vietnamese. */
  promptVi: string;
  /** Read by TTS. Numbers and letters are written the way they are said. */
  spoken: string;
  answers: string[];
  voice: ListeningVoice;
  style: ListeningStyle;
  /** Why it is easy to get wrong. */
  tipVi?: string;
}

export const DRILL_CATEGORIES: { id: DrillCategory; title: string; descriptionVi: string }[] = [
  { id: 'names', title: 'Tên đánh vần', descriptionVi: 'Họ tên, tên đường được đánh vần từng chữ cái.' },
  { id: 'phone', title: 'Số điện thoại', descriptionVi: '"double", "oh" và cách ngắt nhóm số.' },
  { id: 'dates', title: 'Ngày tháng', descriptionVi: 'Ngày, tháng và người nói đổi ý.' },
  { id: 'codes', title: 'Mã và mã bưu điện', descriptionVi: 'Chữ và số xen kẽ: mã đặt chỗ, mã bưu điện.' },
  { id: 'numbers', title: 'Giá, giờ, số lượng', descriptionVi: '13 hay 30, giá tiền có số lẻ, giờ hẹn.' },
];

export const DRILL_SIZE = 8;

export const DRILL_ITEMS: DrillItem[] = [
  // Names
  { id: 'n1', category: 'names', promptVi: 'Họ của người đặt chỗ', spoken: "The surname is Thompson. That's T, H, O, M, P, S, O, N.", answers: ['Thompson'], voice: 'Kore', style: 'uk', tipVi: 'Có chữ P câm giữa M và S.' },
  { id: 'n2', category: 'names', promptVi: 'Tên đường', spoken: "I live on Beckworth Road. B, E, C, K, W, O, R, T, H.", answers: ['Beckworth', 'Beckworth Road'], voice: 'Puck', style: 'uk' },
  { id: 'n3', category: 'names', promptVi: 'Họ của học viên', spoken: "My family name is Gillespie. G, I, double L, E, S, P, I, E.", answers: ['Gillespie'], voice: 'Aoede', style: 'uk', tipVi: '"double L" là hai chữ L liền nhau.' },
  { id: 'n4', category: 'names', promptVi: 'Tên khách sạn', spoken: "We're staying at the Harrington Hotel. That's H, A, double R, I, N, G, T, O, N.", answers: ['Harrington', 'Harrington Hotel'], voice: 'Charon', style: 'uk' },
  { id: 'n5', category: 'names', promptVi: 'Họ của giáo viên', spoken: "Her name is Mrs Jevons. J, E, V, for Victor, O, N, S.", answers: ['Jevons', 'Mrs Jevons'], voice: 'Leda', style: 'uk', tipVi: 'V và B dễ nghe nhầm, nên người nói thêm "V for Victor".' },
  { id: 'n6', category: 'names', promptVi: 'Tên thị trấn', spoken: "It's a small town called Ashcombe. A, S, H, C, O, M, B, E.", answers: ['Ashcombe'], voice: 'Orus', style: 'uk', tipVi: 'Chữ B và E cuối không được đọc khi nói tên.' },
  { id: 'n7', category: 'names', promptVi: 'Họ của người gọi', spoken: "It's Kowalski. K, O, W, A, L, S, K, I.", answers: ['Kowalski'], voice: 'Kore', style: 'us' },
  { id: 'n8', category: 'names', promptVi: 'Tên công viên', spoken: "Meet me at Fairleigh Park. F, A, I, R, L, E, I, G, H.", answers: ['Fairleigh', 'Fairleigh Park'], voice: 'Puck', style: 'uk', tipVi: 'Âm "lee" được viết là -leigh.' },
  { id: 'n9', category: 'names', promptVi: 'Họ của bác sĩ', spoken: "You'll be seeing Doctor Nyquist. N, Y, Q, U, I, S, T.", answers: ['Nyquist', 'Dr Nyquist', 'Doctor Nyquist'], voice: 'Aoede', style: 'uk' },
  { id: 'n10', category: 'names', promptVi: 'Tên quán cà phê', spoken: "It's called the Willowbrook Café. W, I, double L, O, W, B, R, O, O, K.", answers: ['Willowbrook', 'Willowbrook Cafe'], voice: 'Charon', style: 'uk' },

  // Phone numbers
  { id: 'p1', category: 'phone', promptVi: 'Số điện thoại di động', spoken: "It's oh seven seven double one, four eight three, nine two six.", answers: ['07711483926'], voice: 'Kore', style: 'uk', tipVi: '"oh" là số 0, "double one" là 11.' },
  { id: 'p2', category: 'phone', promptVi: 'Số điện thoại văn phòng', spoken: "The office number is oh one six three two, five five nine, oh four eight.", answers: ['01632559048'], voice: 'Charon', style: 'uk' },
  { id: 'p3', category: 'phone', promptVi: 'Số điện thoại nhà', spoken: "My home number is two four six, double eight, three oh one.", answers: ['24688301'], voice: 'Aoede', style: 'uk' },
  { id: 'p4', category: 'phone', promptVi: 'Số điện thoại', spoken: "Call me on oh seven nine double four, six one two, seven three five. Sorry, the last part is seven three nine.", answers: ['07944612739'], voice: 'Puck', style: 'uk', tipVi: 'Người nói sửa lại ba số cuối.' },
  { id: 'p5', category: 'phone', promptVi: 'Số điện thoại phòng khám', spoken: "The clinic is on oh two oh, seven nine four six, triple three one.", answers: ['02079463331'], voice: 'Leda', style: 'uk', tipVi: '"triple three" là 333.' },
  { id: 'p6', category: 'phone', promptVi: 'Số điện thoại', spoken: "It's eight one three, five five five, oh one nine two.", answers: ['8135550192'], voice: 'Orus', style: 'us' },
  { id: 'p7', category: 'phone', promptVi: 'Số điện thoại di động', spoken: "Oh seven four oh oh, nine one five, two six eight.", answers: ['07400915268'], voice: 'Kore', style: 'uk' },
  { id: 'p8', category: 'phone', promptVi: 'Số điện thoại khẩn cấp', spoken: "The night number is oh eight hundred, six double two, four one five.", answers: ['0800622415'], voice: 'Charon', style: 'uk', tipVi: '"oh eight hundred" là 0800.' },

  // Dates
  { id: 'd1', category: 'dates', promptVi: 'Ngày bắt đầu khoá học', spoken: "The course starts on the fourteenth of March.", answers: ['14 March'], voice: 'Aoede', style: 'uk' },
  { id: 'd2', category: 'dates', promptVi: 'Ngày nhận phòng', spoken: "We arrive on the second of August. Oh, actually, our flight changed, so it's the third.", answers: ['3 August'], voice: 'Puck', style: 'uk', tipVi: 'Người nói đổi ý: đáp án là ngày sau.' },
  { id: 'd3', category: 'dates', promptVi: 'Hạn nộp bài', spoken: "The deadline is Friday the twenty-first of November.", answers: ['21 November', 'Friday 21 November'], voice: 'Leda', style: 'lecture' },
  { id: 'd4', category: 'dates', promptVi: 'Ngày sinh', spoken: "My date of birth is the thirtieth of September, nineteen ninety-eight.", answers: ['30 September 1998'], voice: 'Kore', style: 'uk' },
  { id: 'd5', category: 'dates', promptVi: 'Ngày hội chợ', spoken: "The fair is usually on the first of June, but this year it's been moved to the eighth.", answers: ['8 June'], voice: 'Charon', style: 'uk' },
  { id: 'd6', category: 'dates', promptVi: 'Ngày hẹn', spoken: "Could you come in on the twelfth of February?", answers: ['12 February'], voice: 'Orus', style: 'uk', tipVi: 'February có chữ r sau b, hay bị viết thiếu.' },
  { id: 'd7', category: 'dates', promptVi: 'Ngày kết thúc hợp đồng', spoken: "The contract ends on the thirty-first of January.", answers: ['31 January'], voice: 'Aoede', style: 'uk' },
  { id: 'd8', category: 'dates', promptVi: 'Ngày khai trương', spoken: "The new library opens on Wednesday the seventeenth of October.", answers: ['17 October', 'Wednesday 17 October'], voice: 'Puck', style: 'us' },

  // Codes
  { id: 'c1', category: 'codes', promptVi: 'Mã bưu điện', spoken: "The postcode is B, S, nine, four, Q, T.", answers: ['BS9 4QT'], voice: 'Kore', style: 'uk' },
  { id: 'c2', category: 'codes', promptVi: 'Mã đặt chỗ', spoken: "Your booking reference is K, L, seven, two, oh, nine.", answers: ['KL7209'], voice: 'Charon', style: 'uk', tipVi: '"oh" trong mã là số 0, không phải chữ O.' },
  { id: 'c3', category: 'codes', promptVi: 'Mã bưu điện', spoken: "It's E, H, twelve, five, J, G.", answers: ['EH12 5JG'], voice: 'Aoede', style: 'uk', tipVi: 'G và J dễ nhầm.' },
  { id: 'c4', category: 'codes', promptVi: 'Mã thẻ thư viện', spoken: "My library card number is L, B, double four, eight, one, six.", answers: ['LB44816'], voice: 'Puck', style: 'uk' },
  { id: 'c5', category: 'codes', promptVi: 'Số hiệu chuyến bay', spoken: "The flight number is V, S, two oh five.", answers: ['VS205'], voice: 'Leda', style: 'uk', tipVi: 'V và B dễ nhầm.' },
  { id: 'c6', category: 'codes', promptVi: 'Mã bưu điện', spoken: "The postcode is M, twenty, three, A, Y.", answers: ['M20 3AY'], voice: 'Orus', style: 'uk' },
  { id: 'c7', category: 'codes', promptVi: 'Mã sinh viên', spoken: "My student number is S, double oh, four, seven, nine, two.", answers: ['S004792'], voice: 'Kore', style: 'uk' },
  { id: 'c8', category: 'codes', promptVi: 'Mã đơn hàng', spoken: "The order code is H, P, three, three, E, eight.", answers: ['HP33E8'], voice: 'Charon', style: 'us', tipVi: 'E và I dễ nhầm.' },

  // Prices, times and quantities
  { id: 'm1', category: 'numbers', promptVi: 'Giá vé người lớn (£)', spoken: "Adult tickets are thirteen pounds fifty.", answers: ['13.50', '13.5'], voice: 'Aoede', style: 'uk', tipVi: 'thir-TEEN (13) nhấn âm sau, THIR-ty (30) nhấn âm đầu.' },
  { id: 'm2', category: 'numbers', promptVi: 'Phí hằng tháng (£)', spoken: "It's thirty pounds a month, or three hundred a year.", answers: ['30'], voice: 'Puck', style: 'uk' },
  { id: 'm3', category: 'numbers', promptVi: 'Giờ tập trung', spoken: "The coach leaves at quarter to eight, so please be there by seven thirty.", answers: ['7.30', '7:30', '7.30 am'], voice: 'Charon', style: 'uk', tipVi: 'Câu hỏi là giờ tập trung, không phải giờ xe chạy.' },
  { id: 'm4', category: 'numbers', promptVi: 'Số người tối đa', spoken: "Each group can have up to fifteen people. Sorry, fourteen, because the guide counts too.", answers: ['14'], voice: 'Leda', style: 'uk' },
  { id: 'm5', category: 'numbers', promptVi: 'Giá phòng mỗi đêm (£)', spoken: "A double room is eighty-five pounds per night, breakfast included.", answers: ['85'], voice: 'Kore', style: 'uk' },
  { id: 'm6', category: 'numbers', promptVi: 'Tiền đặt cọc (£)', spoken: "We'll need a deposit of one hundred and twenty pounds.", answers: ['120'], voice: 'Orus', style: 'uk' },
  { id: 'm7', category: 'numbers', promptVi: 'Chiều dài đường mòn (km)', spoken: "The full trail is about seventeen kilometres long.", answers: ['17'], voice: 'Aoede', style: 'uk', tipVi: 'seven-TEEN (17) khác SEVEN-ty (70).' },
  { id: 'm8', category: 'numbers', promptVi: 'Giá vé trẻ em ($)', spoken: "Children under twelve pay six dollars seventy-five.", answers: ['6.75'], voice: 'Puck', style: 'us' },
  { id: 'm9', category: 'numbers', promptVi: 'Giờ đóng cửa', spoken: "We close at half past nine on weekdays.", answers: ['9.30', '9:30', '9.30 pm'], voice: 'Charon', style: 'uk', tipVi: '"half past nine" là 9.30.' },
  { id: 'm10', category: 'numbers', promptVi: 'Số năm kinh nghiệm', spoken: "She's been teaching for nineteen years.", answers: ['19'], voice: 'Leda', style: 'uk' },
];
