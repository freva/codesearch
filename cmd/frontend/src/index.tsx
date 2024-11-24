import ReactDOM from 'react-dom/client';
import dayjs from 'dayjs';
import dayjs_relativeTime from 'dayjs/plugin/relativeTime';
import dayjs_utc from 'dayjs/plugin/utc';
import App from './App/index';

dayjs.extend(dayjs_relativeTime);
dayjs.extend(dayjs_utc);

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
