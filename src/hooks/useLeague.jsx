import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { leagues as leaguesApi, events as eventsApi, standings } from '../lib/api';
import { useAuth } from './useAuth';

const LeagueContext = createContext({});

export const useLeague = () => {
  const context = useContext(LeagueContext);
  if (!context) {
    throw new Error('useLeague must be used within a LeagueProvider');
  }
  return context;
};

export const LeagueProvider = ({ children }) => {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState([]);
  const [currentLeague, setCurrentLeague] = useState(null);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myMembership, setMyMembership] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user's leagues
  useEffect(() => {
    if (user) {
      loadMyLeagues();
    } else {
      setLeagues([]);
      setCurrentLeague(null);
    }
  }, [user]);

  // Load league data when current league changes
  useEffect(() => {
    if (currentLeague) {
      loadLeagueData(currentLeague.id);
    }
  }, [currentLeague?.id]);

  const loadMyLeagues = async () => {
    setLoading(true);
    try {
      const { data, error } = await leaguesApi.getMyLeagues();
      if (error) throw error;

      const leagueList = data?.map(m => ({
        ...m.leagues,
        myRole: m.role,
        myStatus: m.status,
      })) || [];

      setLeagues(leagueList);

      // Auto-select first league or last selected
      const lastLeagueId = localStorage.getItem('lastLeagueId');
      const lastLeague = leagueList.find(l => l.id === lastLeagueId);
      
      if (lastLeague) {
        setCurrentLeague(lastLeague);
      } else if (leagueList.length > 0) {
        setCurrentLeague(leagueList[0]);
      }
    } catch (err) {
      console.error('Error loading leagues:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeagueData = async (leagueId) => {
    setLoading(true);
    try {
      // Load members
      const { data: membersData } = await leaguesApi.getMembers(leagueId);
      setMembers(membersData || []);

      // Find my membership
      const myMember = membersData?.find(m => m.user_id === user?.id);
      setMyMembership(myMember);

      // Load upcoming events
      const { data: eventsData } = await eventsApi.getUpcoming(leagueId);
      setEvents(eventsData || []);

      // Load leaderboard
      const { data: standingsData } = await standings.getLeaderboard(leagueId);
      setLeaderboard(standingsData || []);

      // Save last league
      localStorage.setItem('lastLeagueId', leagueId);
    } catch (err) {
      console.error('Error loading league data:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchLeague = (league) => {
    setCurrentLeague(league);
  };

  const createLeague = async (leagueData) => {
    try {
      const { data, error } = await leaguesApi.create(leagueData, user.id);
      if (error) throw error;

      await loadMyLeagues();
      setCurrentLeague(data);
      
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const updateLeague = async (updates) => {
    try {
      const { data, error } = await leaguesApi.update(currentLeague.id, updates);
      if (error) throw error;

      setCurrentLeague({ ...currentLeague, ...data });
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const joinLeague = async (leagueId) => {
    try {
      const { data, error } = await leaguesApi.join(leagueId, user.id);
      if (error) throw error;

      await loadMyLeagues();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const refreshEvents = async () => {
    if (currentLeague) {
      const { data } = await eventsApi.getUpcoming(currentLeague.id);
      setEvents(data || []);
    }
  };

  const refreshMembers = async () => {
    if (currentLeague) {
      const { data } = await leaguesApi.getMembers(currentLeague.id);
      setMembers(data || []);
    }
  };

  const refreshLeaderboard = async () => {
    if (currentLeague) {
      const { data } = await standings.getLeaderboard(currentLeague.id);
      setLeaderboard(data || []);
    }
  };

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin';
  const isOwner = myMembership?.role === 'owner';

  const value = {
    leagues,
    currentLeague,
    members,
    events,
    leaderboard,
    myMembership,
    loading,
    isAdmin,
    isOwner,
    switchLeague,
    createLeague,
    updateLeague,
    joinLeague,
    refreshEvents,
    refreshMembers,
    refreshLeaderboard,
    reload: () => currentLeague && loadLeagueData(currentLeague.id),
  };

  return (
    <LeagueContext.Provider value={value}>
      {children}
    </LeagueContext.Provider>
  );
};

export default LeagueContext;
