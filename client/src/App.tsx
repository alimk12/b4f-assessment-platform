import { BrowserRouter } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import { AlertsProvider } from './context/AlertsContext';
import { AttemptProvider } from './context/AttemptContext';
import { AuthProvider } from './context/AuthContext';
import { CohortProvider } from './context/CohortContext';
import { InstructorAttemptsProvider } from './context/InstructorAttemptsContext';
import { InstructorTestsProvider } from './context/InstructorTestsContext';
import { StudentTestsProvider } from './context/StudentTestsContext';
import AppRouter from './routes/AppRouter';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CohortProvider>
          <AlertsProvider>
            <AdminProvider>
              <InstructorTestsProvider>
                <InstructorAttemptsProvider>
                  <StudentTestsProvider>
                    <AttemptProvider>
                      <AppRouter />
                    </AttemptProvider>
                  </StudentTestsProvider>
                </InstructorAttemptsProvider>
              </InstructorTestsProvider>
            </AdminProvider>
          </AlertsProvider>
        </CohortProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
