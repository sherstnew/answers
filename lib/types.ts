export type Option = {
  id: string;
  text?: string;
  type?: string;
  [k: string]: any;
};

export type QuestionElement = {
  block_styles?: any[];
  content?: any[];
  text?: string;
  type?: string;
  text_id?: string;
};

export type RightAnswer =
  | { id?: string }
  | { number?: number[] }
  | { string?: string[] }
  | { match?: Record<string, string[]> }
  | { ids_order?: string[] }
  | { ids?: string[] }
  | { text_position_answer?: Array<{ position_id: string; text_id?: string; id: string }> }
  | any;

export interface TestTaskAnswer {
  options?: Option[];
  right_answer?: RightAnswer;
  reference_right_answer?: RightAnswer;
  type: string;
  text_input_rules?: any;
  [k: string]: any;
}

export interface Task {
  access_level: string;
  test_task: {
    id: number;
    question_elements: QuestionElement[];
    answer: TestTaskAnswer;
    meta?: any;
  };
  [k: string]: any;
}

export interface Test {
  name: string;
  tasks: Task[];
}
