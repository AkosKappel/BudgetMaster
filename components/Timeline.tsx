import TimelineSection from '@/components/TimelineSection';
import { Transaction } from '@/types';

type TimelineProps = {
  blocks: { date: string; expenses: Transaction[]; incomes: Transaction[] }[];
};

const Timeline: React.FC<TimelineProps> = ({ blocks }) => {
  return (
    <ul className="timeline timeline-snap-icon max-md:timeline-compact timeline-vertical">
      {blocks.map(({ date, expenses, incomes }) => (
        <li key={date}>
          <hr />
          <div className="timeline-middle">
            <time className="font-mono text-gray-500 italic block mb-1 mx-2">{date}</time>
          </div>
          <TimelineSection transactions={incomes} isIncome={true} />
          <TimelineSection transactions={expenses} isIncome={false} />
          <hr className="my-8" />
        </li>
      ))}
    </ul>
  );
};

export default Timeline;
