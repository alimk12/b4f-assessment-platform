import { FormEvent, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import ErrorMessage from '../../../components/common/ErrorMessage';
import Loading from '../../../components/common/Loading';
import PageContainer from '../../../components/common/PageContainer';
import Pagination from '../../../components/common/Pagination';
import StateBadge from '../../../components/common/StateBadge';
import { PAGE_LIMIT } from '../../../constants';
import { useQuestionBank } from '../../../context/QuestionBankContext';
import { TestType } from '../../../types/common.types';
import BankTestView from './BankTestView';
import './QuestionBankPage.css';

export default function QuestionBankPage() {
  const bank = useQuestionBank();
  const [cityId, setCityId] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [type, setType] = useState<TestType | ''>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { bank.loadFilterOptions(); bank.closeTest(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    bank.loadTests({
      cityId: cityId ? Number(cityId) : undefined, cohortId: cohortId ? Number(cohortId) : undefined,
      type, search: query || undefined, page, limit: PAGE_LIMIT,
    });
  }, [cityId, cohortId, type, query, page]); // eslint-disable-line react-hooks/exhaustive-deps

  if (bank.selectedTest || bank.isDetailLoading) {
    return (
      <PageContainer wide title="Question bank">
        {bank.isDetailLoading && !bank.selectedTest ? <Loading /> : bank.selectedTest && <BankTestView test={bank.selectedTest} onBack={bank.closeTest} />}
      </PageContainer>
    );
  }

  const onSearch = (e: FormEvent) => { e.preventDefault(); setPage(1); setQuery(search.trim()); };
  const cohortOptions = bank.filterOptions.cohorts.filter((c) => !cityId || c.cityId === Number(cityId));

  return (
    <PageContainer wide title="Question bank" subtitle="The tests of every cohort in every city. Read them and copy what you need into your own tests.">
      <form className="ui-toolbar" onSubmit={onSearch}>
        <div>
          <label htmlFor="b-city">City</label>
          <select id="b-city" value={cityId} onChange={(e) => { setPage(1); setCohortId(''); setCityId(e.target.value); }}>
            <option value="">All cities</option>
            {bank.filterOptions.cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="b-cohort">Cohort</label>
          <select id="b-cohort" value={cohortId} onChange={(e) => { setPage(1); setCohortId(e.target.value); }}>
            <option value="">All cohorts</option>
            {cohortOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="b-type">Type</label>
          <select id="b-type" value={type} onChange={(e) => { setPage(1); setType(e.target.value as TestType | ''); }}>
            <option value="">All types</option>
            <option value="MCQ">Multiple choice</option>
            <option value="CODING">Coding</option>
          </select>
        </div>
        <div className="bank-page__search">
          <label htmlFor="b-search">Search</label>
          <input id="b-search" value={search} placeholder="Test title, question or problem…" onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      {bank.bankError && <ErrorMessage message={bank.bankError} />}
      {bank.isBankLoading && bank.tests.length === 0 ? <Loading /> : bank.tests.length === 0 && !bank.bankError ? (
        <EmptyState title="No tests match these filters." />
      ) : (
        <div className="bank-page__grid">
          {bank.tests.map((t) => (
            <button key={t.id} type="button" className="ui-card bank-card" onClick={() => bank.loadTest(t.id)}>
              <div className="bank-card__head">
                <strong>{t.title}</strong>
                {t.isMine && <span className="bank-card__mine">Mine</span>}
              </div>
              <div className="bank-card__badges">
                <StateBadge state={t.type} /> <StateBadge state={t.status} />
                {t.cohort.status === 'ARCHIVED' && <StateBadge state="ARCHIVED" />}
              </div>
              <div className="bank-card__meta">{t.cohort.name} — {t.city.name}</div>
              <div className="bank-card__meta">{t.type === 'MCQ' ? `${t.questionCount} questions` : `${t.problemCount} problems`}</div>
            </button>
          ))}
        </div>
      )}
      <Pagination meta={bank.testsMeta} onPage={setPage} />
    </PageContainer>
  );
}
