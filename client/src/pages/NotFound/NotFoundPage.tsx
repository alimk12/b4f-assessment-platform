import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <div className="not-found__code">404</div>
      <h1>Page not found</h1>
      <Link to="/">Back to home</Link>
    </div>
  );
}
