import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Search, SlidersHorizontal, X, Calendar, Users, ChevronRight } from 'lucide-react';
import { internshipService } from '../services/internshipService';
import type { Internship } from '../types';
import { PageHeader } from '../components/shared/PageHeader';
import { EmptyState } from '../components/shared/EmptyState';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const DURATIONS = ['All', '1 Month', '2 Months', '3 Months', '4 Months', '6 Months'];
const STATUSES = ['All', 'Open', 'Closed'];

const InternshipCard: React.FC<{ internship: Internship; onClick: () => void }> = ({ internship, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-7 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col h-full"
    onClick={onClick}
  >
    {/* Header */}
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
          <Briefcase size={18} className="text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 text-sm leading-tight">{internship.postName}</h3>
        </div>
      </div>
      <Badge
        variant="secondary"
        className={`flex-shrink-0 text-xs ${
          internship.status === 'Open'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
        }`}
      >
        {internship.status}
      </Badge>
    </div>

    {/* Info chips */}
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-500 mb-4">
      <span className="font-semibold text-blue-700">₹{internship.stipend}</span>
      <span>·</span>
      <span>{internship.duration}</span>
    </div>

    {/* Skills */}
    <div className="flex flex-wrap content-start items-start gap-2 mb-6">
      {internship.skills.slice(0, 4).map((skill) => (
        <span key={skill} className="px-2.5 py-1 bg-zinc-100 text-zinc-600 text-xs rounded-lg font-medium">
          {skill}
        </span>
      ))}
      {internship.skills.length > 4 && (
        <span className="px-2.5 py-1 bg-zinc-100 text-zinc-500 text-xs rounded-lg">
          +{internship.skills.length - 4} more
        </span>
      )}
    </div>

    {/* Footer row */}
    <div className="flex items-center justify-between pt-5 border-t border-zinc-100 mt-auto">
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Users size={12} />
          {internship.vacancy} {internship.vacancy === 1 ? 'seat' : 'seats'}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {new Date(internship.interviewDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <span className="text-blue-600 text-xs font-semibold flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
        View Details <ChevronRight size={14} />
      </span>
    </div>
  </motion.div>
);

const Internships: React.FC = () => {
  const navigate = useNavigate();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [duration, setDuration] = useState('All');
  const [status, setStatus] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const data = await internshipService.getInternships();
      if (!mounted) return;
      setInternships(data);
      setLoading(false);
    };

    load();
    const intervalId = window.setInterval(load, 15000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const filtered = useMemo(() => {
    return internships.filter((i) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        i.postName.toLowerCase().includes(q) ||
        i.skills.some((s) => s.toLowerCase().includes(q));
      const matchDuration = duration === 'All' || i.duration === duration;
      const matchStatus = status === 'All' || i.status === status;
      return matchSearch && matchDuration && matchStatus;
    });
  }, [internships, search, duration, status]);

  const hasFilters = search || duration !== 'All' || status !== 'All';
  const clearFilters = () => { setSearch(''); setDuration('All'); setStatus('All'); };

  const openCount = internships.filter((i) => i.status === 'Open').length;

  return (
    <div>
      <PageHeader
        title="Available Internships"
        subtitle={`${openCount} open position${openCount !== 1 ? 's' : ''} available`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Internships' }]}
      />

      {/* Search & Filter bar */}
      <div className="mb-8 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by position or skill..."
              className="pl-9 h-11 border-zinc-300"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                <X size={15} />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-11 gap-2 border-zinc-300 ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filters</span>
            {hasFilters && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
          </Button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200"
          >
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-40 h-9 bg-white border-zinc-300 text-sm">
                <SelectValue placeholder="Duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36 h-9 bg-white border-zinc-300 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-zinc-500 h-9">
                Clear all
              </Button>
            )}
          </motion.div>
        )}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-zinc-500 mb-6">
          Showing <span className="font-semibold text-zinc-900">{filtered.length}</span> result{filtered.length !== 1 ? 's' : ''}
          {hasFilters && ' (filtered)'}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={28} />}
          title="No internships found"
          description="Try adjusting your search or filter criteria."
          action={
            <Button variant="outline" onClick={clearFilters} className="border-zinc-300">
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
          {filtered.map((internship) => (
            <InternshipCard
              key={internship.id}
              internship={internship}
              onClick={() => navigate(`/internships/${internship.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Internships;
