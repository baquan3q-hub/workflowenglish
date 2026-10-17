/**
 * Writing language bank: linking words grouped by what they do, and academic
 * collocations for the topics that come up most in Task 2.
 */

export interface LinkingGroup {
  id: string;
  title: string;
  noteVi: string;
  items: { phrase: string; example: string }[];
}

export interface Collocation {
  phrase: string;
  meaningVi: string;
  example: string;
}

export interface TopicCollocations {
  id: string;
  topic: string;
  titleVi: string;
  items: Collocation[];
}

export const LINKING_GROUPS: readonly LinkingGroup[] = [
  {
    id: 'adding',
    title: 'Bổ sung ý',
    noteVi: 'Đặt ở đầu câu, theo sau là dấu phẩy. Đừng mở đầu mọi đoạn bằng "Firstly, Secondly".',
    items: [
      { phrase: 'Furthermore, / Moreover,', example: 'Moreover, public transport reduces air pollution in city centres.' },
      { phrase: 'In addition,', example: 'In addition, remote work saves employees several hours of commuting each week.' },
      { phrase: 'Another [reason / benefit] is that', example: 'Another benefit is that students can learn at their own pace.' },
      { phrase: 'not only … but also', example: 'Exercise not only improves fitness but also reduces stress.' },
    ],
  },
  {
    id: 'contrast',
    title: 'Đối lập',
    noteVi: '"However" đứng đầu câu có dấu phẩy; "while" và "whereas" nối hai mệnh đề trong một câu.',
    items: [
      { phrase: 'However,', example: 'However, this approach is expensive to implement.' },
      { phrase: 'On the other hand,', example: 'On the other hand, rural areas offer a slower pace of life.' },
      { phrase: 'while / whereas', example: 'Older people prefer newspapers, whereas teenagers get news from social media.' },
      { phrase: 'In contrast,', example: 'In contrast, the figure for France fell by half.' },
    ],
  },
  {
    id: 'concession',
    title: 'Nhượng bộ',
    noteVi: 'Thừa nhận ý kiến ngược lại trước khi phản bác: cách nhanh nhất để bài Opinion có chiều sâu.',
    items: [
      { phrase: 'Although / Even though', example: 'Although online courses are convenient, they offer little social interaction.' },
      { phrase: 'Admittedly,', example: 'Admittedly, tourism creates jobs. However, it can also damage local culture.' },
      { phrase: 'Despite / In spite of + N / V-ing', example: 'Despite being expensive, electric cars are becoming more popular.' },
      { phrase: 'While it is true that', example: 'While it is true that technology saves time, it can also isolate people.' },
    ],
  },
  {
    id: 'cause',
    title: 'Nguyên nhân',
    noteVi: '"Because of", "due to" theo sau là danh từ; "because", "as" theo sau là mệnh đề.',
    items: [
      { phrase: 'because / as / since + mệnh đề', example: 'Many young people leave villages because there are few jobs.' },
      { phrase: 'because of / due to / owing to + N', example: 'Traffic has worsened due to the rise in car ownership.' },
      { phrase: 'stem from / be caused by', example: 'Many health problems stem from a sedentary lifestyle.' },
    ],
  },
  {
    id: 'result',
    title: 'Kết quả',
    noteVi: '"As a result" và "Consequently" mở đầu câu mới; "which leads to" nối tiếp câu trước.',
    items: [
      { phrase: 'As a result, / Consequently,', example: 'As a result, house prices in the capital have doubled.' },
      { phrase: 'lead to / result in + N', example: 'Long working hours can lead to burnout.' },
      { phrase: ', which means that', example: 'Fewer people are having children, which means that the population is ageing.' },
      { phrase: 'Therefore, / Thus,', example: 'Therefore, governments should invest in renewable energy.' },
    ],
  },
  {
    id: 'example',
    title: 'Đưa ví dụ',
    noteVi: 'Ví dụ cụ thể (một quốc gia, một con số hợp lý, một tình huống) giúp tăng điểm Task Response.',
    items: [
      { phrase: 'For example, / For instance,', example: 'For instance, Singapore charges drivers to enter the city centre.' },
      { phrase: 'such as + N', example: 'Outdoor activities such as hiking improve mental health.' },
      { phrase: 'A clear example of this is', example: 'A clear example of this is the ban on plastic bags in many countries.' },
    ],
  },
  {
    id: 'opinion',
    title: 'Nêu quan điểm',
    noteVi: 'Tránh "I think" lặp lại nhiều lần. Đừng dùng "In my opinion, I think" (thừa ý).',
    items: [
      { phrase: 'I firmly believe that', example: 'I firmly believe that education should be free for everyone.' },
      { phrase: 'In my view,', example: 'In my view, the benefits of tourism outweigh its drawbacks.' },
      { phrase: 'It seems to me that', example: 'It seems to me that children today have less free time than in the past.' },
    ],
  },
  {
    id: 'conclusion',
    title: 'Kết luận',
    noteVi: 'Không đưa ý mới vào kết bài. "In conclusion" là đủ, không cần "To conclude, in conclusion".',
    items: [
      { phrase: 'In conclusion,', example: 'In conclusion, both governments and individuals must act to reduce waste.' },
      { phrase: 'To sum up,', example: 'To sum up, working from home has more advantages than disadvantages.' },
      { phrase: 'Overall, (Task 1)', example: 'Overall, spending on food fell while spending on housing rose.' },
    ],
  },
];

export const TOPIC_COLLOCATIONS: readonly TopicCollocations[] = [
  {
    id: 'education',
    topic: 'Education',
    titleVi: 'Giáo dục',
    items: [
      { phrase: 'acquire knowledge', meaningVi: 'tiếp thu kiến thức', example: 'Students acquire knowledge more effectively through hands-on projects.' },
      { phrase: 'academic performance', meaningVi: 'kết quả học tập', example: 'Lack of sleep can harm academic performance.' },
      { phrase: 'tuition fees', meaningVi: 'học phí', example: 'Rising tuition fees discourage some students from going to university.' },
      { phrase: 'rote learning', meaningVi: 'học vẹt', example: 'Rote learning does little to develop critical thinking.' },
      { phrase: 'vocational training', meaningVi: 'đào tạo nghề', example: 'Vocational training prepares young people for skilled jobs.' },
      { phrase: 'a well-rounded education', meaningVi: 'nền giáo dục toàn diện', example: 'Sport and art are part of a well-rounded education.' },
      { phrase: 'face-to-face interaction', meaningVi: 'tương tác trực tiếp', example: 'Online classes lack face-to-face interaction.' },
    ],
  },
  {
    id: 'environment',
    topic: 'Environment',
    titleVi: 'Môi trường',
    items: [
      { phrase: 'carbon emissions', meaningVi: 'khí thải carbon', example: 'Aviation is responsible for a growing share of carbon emissions.' },
      { phrase: 'renewable energy', meaningVi: 'năng lượng tái tạo', example: 'Governments should subsidise renewable energy such as solar power.' },
      { phrase: 'tackle climate change', meaningVi: 'giải quyết biến đổi khí hậu', example: 'International cooperation is needed to tackle climate change.' },
      { phrase: 'endangered species', meaningVi: 'loài có nguy cơ tuyệt chủng', example: 'Deforestation threatens many endangered species.' },
      { phrase: 'single-use plastics', meaningVi: 'nhựa dùng một lần', example: 'Several countries have banned single-use plastics.' },
      { phrase: 'raise awareness', meaningVi: 'nâng cao nhận thức', example: 'Campaigns can raise awareness of the need to recycle.' },
      { phrase: 'sustainable development', meaningVi: 'phát triển bền vững', example: 'Tourism must be balanced with sustainable development.' },
    ],
  },
  {
    id: 'technology',
    topic: 'Technology',
    titleVi: 'Công nghệ',
    items: [
      { phrase: 'technological advances', meaningVi: 'tiến bộ công nghệ', example: 'Technological advances have transformed the way we work.' },
      { phrase: 'social media platforms', meaningVi: 'nền tảng mạng xã hội', example: 'Social media platforms spread news faster than newspapers.' },
      { phrase: 'screen time', meaningVi: 'thời gian dùng thiết bị', example: 'Parents should limit their children\'s screen time.' },
      { phrase: 'invasion of privacy', meaningVi: 'xâm phạm quyền riêng tư', example: 'Facial recognition cameras may lead to an invasion of privacy.' },
      { phrase: 'automation', meaningVi: 'tự động hoá', example: 'Automation is replacing many manual jobs.' },
      { phrase: 'the digital divide', meaningVi: 'khoảng cách số', example: 'The digital divide leaves poorer families behind.' },
    ],
  },
  {
    id: 'health',
    topic: 'Health',
    titleVi: 'Sức khoẻ',
    items: [
      { phrase: 'a sedentary lifestyle', meaningVi: 'lối sống ít vận động', example: 'Office workers often lead a sedentary lifestyle.' },
      { phrase: 'a balanced diet', meaningVi: 'chế độ ăn cân bằng', example: 'A balanced diet reduces the risk of heart disease.' },
      { phrase: 'obesity rates', meaningVi: 'tỉ lệ béo phì', example: 'Obesity rates among children have risen sharply.' },
      { phrase: 'preventive healthcare', meaningVi: 'y tế dự phòng', example: 'Investing in preventive healthcare saves money in the long run.' },
      { phrase: 'mental well-being', meaningVi: 'sức khoẻ tinh thần', example: 'Regular exercise improves mental well-being.' },
      { phrase: 'life expectancy', meaningVi: 'tuổi thọ trung bình', example: 'Life expectancy has increased thanks to medical progress.' },
    ],
  },
  {
    id: 'work',
    topic: 'Work',
    titleVi: 'Công việc',
    items: [
      { phrase: 'work-life balance', meaningVi: 'cân bằng công việc và cuộc sống', example: 'Flexible hours help employees achieve a better work-life balance.' },
      { phrase: 'job satisfaction', meaningVi: 'sự hài lòng trong công việc', example: 'Job satisfaction matters more to many people than salary.' },
      { phrase: 'career prospects', meaningVi: 'triển vọng nghề nghiệp', example: 'A university degree can improve career prospects.' },
      { phrase: 'the unemployment rate', meaningVi: 'tỉ lệ thất nghiệp', example: 'The unemployment rate among graduates has fallen.' },
      { phrase: 'remote working', meaningVi: 'làm việc từ xa', example: 'Remote working has become common since 2020.' },
      { phrase: 'climb the career ladder', meaningVi: 'thăng tiến', example: 'Some people move abroad to climb the career ladder faster.' },
    ],
  },
  {
    id: 'government',
    topic: 'Government',
    titleVi: 'Chính phủ và xã hội',
    items: [
      { phrase: 'allocate funding', meaningVi: 'phân bổ ngân sách', example: 'Governments must decide how to allocate funding between health and education.' },
      { phrase: 'public services', meaningVi: 'dịch vụ công', example: 'Higher taxes can pay for better public services.' },
      { phrase: 'impose a ban on', meaningVi: 'ban hành lệnh cấm', example: 'The city imposed a ban on cars in the old town.' },
      { phrase: 'enforce regulations', meaningVi: 'thực thi quy định', example: 'Authorities need to enforce regulations on food safety.' },
      { phrase: 'the cost of living', meaningVi: 'chi phí sinh hoạt', example: 'The cost of living in big cities keeps rising.' },
      { phrase: 'an ageing population', meaningVi: 'dân số già', example: 'An ageing population puts pressure on pension systems.' },
    ],
  },
];
