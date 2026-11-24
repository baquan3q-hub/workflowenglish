/** Worked errors and a different transfer prompt for spaced review. */
export const transfer: Record<string, { wrong: string; right: string; why: string; review: string }> = {
  be: {
    wrong: 'I student.',
    right: 'I am a student.',
    why: 'Hãy thêm be trước danh từ nói nghề hoặc vai trò.',
    review: 'Gửi lời chào cho một bạn mới, nói bạn là ai và bạn của bạn đang ở đâu.',
  },
  subject: {
    wrong: 'Her is my teacher.',
    right: 'She is my teacher.',
    why: 'Chỗ đầu câu cần đại từ chủ ngữ she.',
    review: 'Giới thiệu hai đồng nghiệp, rồi dùng đại từ thay cho cả hai người.',
  },
  verb: {
    wrong: 'I am work at home.',
    right: 'I work at home.',
    why: 'Work đã là động từ chính ở hiện tại đơn.',
    review: 'Viết cho bạn mới biết hai việc bạn làm sau bữa tối.',
  },
  order: {
    wrong: 'I like coffee hot.',
    right: 'I like hot coffee.',
    why: 'Hot mô tả coffee, đặt tính từ trước danh từ trong cụm này.',
    review: 'Nhắn bạn mua một đồ vật có màu cụ thể, mở đầu bằng I need.',
  },
  'be-question': {
    wrong: 'You are busy?',
    right: 'Are you busy?',
    why: 'Trong câu hỏi có/không trung tính, chuyển are lên trước you.',
    review: 'Hỏi xem hai chỗ ngồi có còn trống và trả lời phủ định.',
  },
  'do-question': {
    wrong: 'Does Mai walks?',
    right: 'Does Mai walk?',
    why: 'Does mang dấu hiệu ngôi thứ ba, walk giữ nguyên.',
    review: 'Hỏi nhân viên thư viện xem thư viện có mở cửa ngày Chủ nhật không.',
  },
  negative: {
    wrong: "He doesn't likes tea.",
    right: "He doesn't like tea.",
    why: "Sau doesn't dùng like.",
    review: 'Viết về một loại đồ ăn hoặc đồ uống một người bạn không thích.',
  },
  wh: {
    wrong: 'Where you work?',
    right: 'Where do you work?',
    why: 'Khi hỏi nơi làm việc, thêm do trước you.',
    review: 'Hỏi một cửa hàng mở cửa lúc nào và nằm ở đâu.',
  },
  articles: {
    wrong: 'He is engineer.',
    right: 'He is an engineer.',
    why: 'Engineer là danh từ nghề nghiệp đếm được số ít và bắt đầu bằng nguyên âm.',
    review: 'Giới thiệu một món quà bằng a hoặc an, sau đó nhắc lại bằng the.',
  },
  plural: {
    wrong: 'How many water?',
    right: 'How much water?',
    why: 'Water chỉ chất lỏng nên chọn much khi hỏi lượng.',
    review: 'Hỏi lượng nước và số chiếc cốc cần cho một buổi dã ngoại.',
  },
  possessive: {
    wrong: 'She bag is here.',
    right: 'Her bag is here.',
    why: 'Trước bag cần từ chỉ sở hữu her.',
    review: 'Viết cho bạn cùng phòng biết đâu là chìa khoá của bạn và đâu là của Nam.',
  },
  location: {
    wrong: 'There is two shops.',
    right: 'There are two shops.',
    why: 'Cụm two shops là số nhiều nên dùng are.',
    review: 'Mô tả một vật trên bàn và hai vật ở dưới bàn.',
  },
  agreement: {
    wrong: 'My aunt teach English.',
    right: 'My aunt teaches English.',
    why: 'Một người làm chủ ngữ, teach thêm -es.',
    review: 'So sánh việc một đồng nghiệp và nhiều đồng nghiệp làm mỗi ngày.',
  },
  frequency: {
    wrong: 'I walk to school every days.',
    right: 'I walk to school every day.',
    why: 'Sau every dùng danh từ đếm được số ít.',
    review: 'Kể bạn ghé thư viện thường xuyên như thế nào bằng hai cách nói tần suất.',
  },
  continuous: {
    wrong: 'She cooking now.',
    right: 'She is cooking now.',
    why: 'Đang diễn ra cần cả be và V-ing.',
    review: 'Đối chiếu một việc thường ngày và việc người đó đang làm lúc này.',
  },
  ability: {
    wrong: 'She can sings.',
    right: 'She can sing.',
    why: 'Can đi với động từ nguyên mẫu ở mọi ngôi.',
    review: 'Nhờ lễ tân giúp gọi taxi bằng Can you.',
  },
  'was-were': {
    wrong: 'We was late.',
    right: 'We were late.',
    why: 'We đi với were trong câu kể quá khứ.',
    review: 'Cho biết bạn và nhóm bạn ở đâu vào giờ này hôm qua.',
  },
  past: {
    wrong: 'I buy a coat yesterday.',
    right: 'I bought a coat yesterday.',
    why: 'Yesterday đặt việc mua áo vào quá khứ đã kết thúc.',
    review: 'Kể hai việc xảy ra hôm qua sau khi bạn rời khỏi nhà.',
  },
  'past-question': {
    wrong: 'Did you went?',
    right: 'Did you go?',
    why: 'Sau did dùng go.',
    review: 'Hỏi bạn cùng nhà tối qua có mua sữa không, rồi viết một câu trả lời phủ định.',
  },
  'past-continuous': {
    wrong: 'We were eat when he arrived.',
    right: 'We were eating when he arrived.',
    why: 'Sau were dùng eating để tả hành động đang diễn ra.',
    review: 'Kể một việc bị gián đoạn khi chuông cửa reo.',
  },
  future: {
    wrong: 'I going to study.',
    right: 'I am going to study.',
    why: 'Cấu trúc dự định cần be trước going to.',
    review: 'Nhắn cho một người bạn biết ngày mai bạn dự định làm gì.',
  },
  compare: {
    wrong: 'This bus is more cheaper.',
    right: 'This bus is cheaper.',
    why: 'Cheaper đã mang nghĩa so sánh hơn.',
    review: 'So sánh hai món đồ để giải thích vì sao bạn sẽ mua một món.',
  },
  connect: {
    wrong: 'Because it rained, so I stayed home.',
    right: 'Because it rained, I stayed home.',
    why: 'Chỉ cần because để nối nguyên nhân với mệnh đề chính ở đây.',
    review: 'Giải thích vì sao bạn chọn đi bộ hôm nay, rồi nêu một kết quả.',
  },
  experience: {
    wrong: 'I have seen it yesterday.',
    right: 'I saw it yesterday.',
    why: 'Yesterday chỉ thời điểm đã kết thúc, chọn quá khứ đơn.',
    review: 'Hỏi ai đó đã từng xem nhạc sống chưa rồi kể lần bạn đi xem vào năm ngoái.',
  },
};

export const checkpoints = [
  'Bạn vừa vào một lớp mới. Giới thiệu bạn là ai, kể một việc bạn thường làm và nhắc đến một món đồ bạn thích.',
  'Bạn làm quen với hàng xóm. Viết một câu hỏi về thói quen và một câu hỏi về nơi họ làm việc.',
  'Bạn gửi ảnh căn phòng cho bạn mình. Mô tả có những đồ vật gì, số lượng và vị trí của chúng.',
  'Nhắn cho bạn hai câu, phân biệt việc bạn thường làm sau giờ học với việc bạn đang làm lúc này.',
  'Kể một việc đang xảy ra cuối tuần trước thì có một sự việc khác xen vào. Dùng ít nhất hai động từ.',
  'Bạn có hai lựa chọn cho kỳ nghỉ. So sánh hai nơi, nêu dự định và giải thích lý do bạn chọn một nơi.',
];
export const checkpointSkills = ['order', 'do-question', 'location', 'continuous', 'past-continuous', 'connect'];
