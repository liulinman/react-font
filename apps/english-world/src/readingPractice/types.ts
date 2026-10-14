export interface Question {id:string;kind:'choice'|'true_false_not_given';stem:string;options:string[]}
export interface PublicPractice {id:number;title:string;paragraphs:string[];questions:Question[];ieltsBand:number;status:'published'|'withdrawn';submitted:boolean}
export interface PracticeSummary {id:number;title:string;ieltsBand:number;questionCount:number;status:'published'|'withdrawn';submitted:boolean;publishedAt:string;score?:number}
export interface PracticeResult {practiceId:number;submittedAt:string;score:number;correctCount:number;total:number;results:(Question&{selectedIndex:number;correctIndex:number;correct:boolean;explanation:string;evidence:{paragraph:number;quote?:string;missingInformation?:string}})[]}
export interface Submission {requestUid:string;answers:{questionId:string;selectedIndex:number}[]}
