"use client";

import { Task, Test, Option } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TestPageClientProps {
  test: Test;
}

function idToText(options: Option[] | undefined, id: string, test?: Test) {
  const getTextFromOption = (opt: Option) => opt.text ?? opt.name ?? opt.label ?? opt.value ?? (opt as any).title ?? undefined;

  if (options) {
    const opt = options.find((o) => o.id === id);
    const t = opt ? getTextFromOption(opt) : undefined;
    if (t) return t;
  }

  // try to find in the whole test (search all tasks' answer.options)
  if (test) {
    for (const tsk of test.tasks) {
      const ans: any = tsk.test_task.answer;

      // direct options
      const opts: Option[] | undefined = ans?.options;
      if (opts) {
        const found = opts.find((o) => o.id === id);
        if (found) {
          const tf = getTextFromOption(found);
          if (tf) return tf;
        }
      }

      // text_position nested options (gap/inline etc.)
      const tp = ans?.text_position || ans?.text_positions || ans?.text_position_answer;
      if (Array.isArray(tp)) {
        for (const block of tp) {
          const blockOpts: Option[] | undefined = block?.options;
          if (!Array.isArray(blockOpts)) continue;
          const found2 = blockOpts.find((o) => o.id === id);
          if (found2) {
            const tf = getTextFromOption(found2);
            if (tf) return tf;
          }
        }
      }
    }
  }

  return id;
}

function getCorrectAnswerText(task: Task, test?: Test): string[] {
  const ans = task.test_task.answer as any;
  const type: string = ans.type;
  const options: Option[] | undefined = ans.options;

  // single choice
  if (type === "answer/single" && ans.right_answer?.id) {
    return [idToText(options, ans.right_answer.id, test)];
  }

  // string answers
  if (type === "answer/string" && Array.isArray(ans.right_answer?.string)) {
    return ans.right_answer.string;
  }

  // number answers
  if (type === "answer/number" && Array.isArray(ans.right_answer?.number)) {
    return ans.right_answer.number.map(String);
  }

  // multiple (checkboxes) -> ids array
  if (type === "answer/multiple" && Array.isArray(ans.right_answer?.ids)) {
    return ans.right_answer.ids.map((id: string) => idToText(options, id, test));
  }

  // order -> ids_order
  if ((type === "answer/order" || type === "answer/order/vertical") && Array.isArray(ans.right_answer?.ids_order)) {
    const arr = ans.right_answer.ids_order as string[];
    return arr.map((id, i) => `${i + 1}. ${idToText(options, id, test)}`);
  }

  // match -> { sourceId: [targetId] }
  if (type === "answer/match" && ans.right_answer?.match) {
    const match: Record<string, string[]> = ans.right_answer.match;
    // options contain both sources and targets; map ids to text
    const lines: string[] = [];
    for (const [source, targets] of Object.entries(match)) {
      const left = idToText(options, source, test);
      const rights = (targets || []).map((t: string) => idToText(options, t, test));
      const arrow = rights.length > 1 ? ' ↦ ' : ' → ';
      lines.push(`${left}${arrow}${rights.join(', ') || '(нет соответствий)'}`);
    }
    return lines;
  }

  // gap/match/text -> text_position_answer: [{ position_id, text_id, id }]
  if (type && type.startsWith('answer/gap') && Array.isArray(ans.right_answer?.text_position_answer)) {
    return ans.right_answer.text_position_answer.map((p: any, idx: number) => {
      const txt = idToText(options, p.id, test);
      return `${idx + 1}. ${txt}`;
    });
  }

  // inline choice single: similar to single but by text_position_answer
  if (type && type.startsWith('answer/inline') && Array.isArray(ans.right_answer?.text_position_answer)) {
    return ans.right_answer.text_position_answer.map((p: any) => idToText(options, p.id, test));
  }

  // fallback: if right_answer has ids array
  if (Array.isArray(ans.right_answer?.ids)) {
    return ans.right_answer.ids.map((id: string) => idToText(options, id, test));
  }

  // newer format: right_answer.answers -> [{ id, strings: [...] }, ...]
  if (Array.isArray(ans.right_answer?.answers)) {
    const out: string[] = [];
    for (const a of ans.right_answer.answers) {
      if (Array.isArray(a.strings)) {
        out.push(...a.strings.map((s: any) => (typeof s === 'string' ? s : String(s))));
        continue;
      }
      if (Array.isArray(a.string)) {
        out.push(...a.string.map((s: any) => (typeof s === 'string' ? s : String(s))));
        continue;
      }
      if (a.id) {
        out.push(idToText(options, a.id, test));
      }
    }
    if (out.length > 0) return out;
  }

  // table format: cells -> { "row": { "col": [text] } }
  if (type === "answer/table" && ans.right_answer?.cells) {
    const cells: Record<string, Record<string, string[]>> = ans.right_answer.cells;
    const lines: string[] = [];
    for (const [row, cols] of Object.entries(cells)) {
      for (const [col, texts] of Object.entries(cols)) {
        if (Array.isArray(texts) && texts.length > 0) {
          const rowNum = parseInt(row) + 1;
          const colNum = parseInt(col) + 1;
          lines.push(`Столбец ${colNum}, строка ${rowNum - 1}: ${texts.join(', ')}`);
        }
      }
    }
    return lines.length > 0 ? lines : ['Нет ответов'];
  }

  // groups format: groups -> [{ group_id, options_ids: [ids] }, ...]
  if (type === "answer/groups" && ans.right_answer?.groups) {
    const groups: Array<{ group_id: string; options_ids: string[] }> = ans.right_answer.groups;
    const lines: string[] = [];
    for (const group of groups) {
      const groupText = idToText(options, group.group_id, test);
      const optionTexts = group.options_ids.map((optId: string) => idToText(options, optId, test));
      lines.push(`${groupText}: ${optionTexts.join(', ')}`);
    }
    return lines.length > 0 ? lines : ['Нет ответов'];
  }

  // unknown: dump as JSON prettified
  try {
    return [JSON.stringify(ans.right_answer || ans, null, 2)];
  } catch (e) {
    return ['Нет данных'];
  }
}

function generateCopyText(test: Test) {
  return test.tasks
    .map((task, index) => {
      const question =
        task.test_task.question_elements[0]?.text || "Нет вопроса";
      const answers = getCorrectAnswerText(task, test);
      return `Вопрос ${index + 1}\n${question}\nОтвет\n${answers.join("\n")}`;
    })
    .join("\n\n");
}

export default function TestPageClient({ test }: TestPageClientProps) {
  return (
    <div className="w-full flex flex-col gap-5 p-5">
      <Link href={'/'}>
        <Button className="w-fit">Обратно</Button>
      </Link>
      <header className="text-3xl">{test.name}</header>
      <Button
        className="w-fit"
        onClick={() => {
          navigator.clipboard.writeText(generateCopyText(test)).then(() => {
            alert("Ответы скопированы в буфер обмена");
          });
        }}
      >
        Скопировать ответы
      </Button>

      {test.tasks.map((task, index) => {
        const answers = getCorrectAnswerText(task, test);

        return (
          <Card key={index}>
            <CardHeader>Задание {index + 1}</CardHeader>
            <CardDescription className="px-6">
              {task.test_task.question_elements[0].text}
            </CardDescription>
            <CardContent>
              {answers.length > 0 ? (
                answers.map((answer, i) => (
                  <div key={i} className="py-1">
                    {answer}
                  </div>
                ))
              ) : (
                <div>Нет ответов</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
