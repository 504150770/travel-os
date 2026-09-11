'use client';

import { useAppController } from '@/features/app/useAppController';
import { AppShell } from '@/components/shell/AppShell';
import { HomeView } from '@/views/home/HomeView';
import { TripView } from '@/views/trip/TripView';
import { DiscoverView } from '@/views/discover/DiscoverView';
import { PlanView } from '@/views/plan/PlanView';
import { MoreView } from '@/views/more/MoreView';

export default function TravelGuideV3() {
  const controller = useAppController();
  const {
    view, selectedDay, planTab, moreTab, discoverTab, discoverCity, clock,
    actions, entities, resolve, addCustom, deleteCustom,
    bookingStatuses, setBookingStatuses, actionStatuses, setActionStatuses,
    actuals, setActuals, favorites, setFavorites,
    preferredTransport, setPreferredTransport, privateLinks, setPrivateLinks,
    notes, setNotes, budgetState, activeEntities, nextAction, actualTotal,
    daysLeft, backup, importBackup, navigate, selectTripDay,
    selectDiscoverTab, selectDiscoverCity, selectPlanTab, selectMoreTab,
    selectMoreDay, openNextAction, openBudget, setLightbox,
  } = controller;

  return (
    <AppShell controller={controller}>
      <div key={view} className="view-transition">
        {view === 'home' && <HomeView
          daysLeft={daysLeft} nextAction={nextAction}
          projectedBudget={budgetState.projected} actualTotal={actualTotal}
          unknownCosts={budgetState.unknown} activeEntityCount={activeEntities.length}
          openTrip={() => navigate('trip')} openNextAction={openNextAction} openBudget={openBudget}
        />}
        {view === 'trip' && <TripView
          selectedDay={selectedDay} setSelectedDay={selectTripDay} resolve={resolve}
          entities={entities} actions={actions} open={setLightbox} clock={clock}
          addCustom={addCustom} preferredTransport={preferredTransport}
          tomorrowAction={nextAction?.title} bookingStatuses={bookingStatuses}
          actionStatuses={actionStatuses} privateLinks={privateLinks}
        />}
        {view === 'discover' && <DiscoverView
          selectedDay={selectedDay} entities={entities} resolve={resolve} actions={actions}
          open={setLightbox} favorites={favorites} setFavorites={setFavorites}
          deleteCustom={deleteCustom} tab={discoverTab} setTab={selectDiscoverTab}
          city={discoverCity} setCity={selectDiscoverCity}
        />}
        {view === 'plan' && <PlanView
          controller={controller}
          tab={planTab} setTab={selectPlanTab} bookingStatuses={bookingStatuses}
          setBookingStatuses={setBookingStatuses} actionStatuses={actionStatuses}
          setActionStatuses={setActionStatuses} actuals={actuals} setActuals={setActuals}
          budgetState={budgetState} preferredTransport={preferredTransport}
          setPreferredTransport={setPreferredTransport} privateLinks={privateLinks}
          setPrivateLinks={setPrivateLinks}
        />}
        {view === 'more' && <MoreView
          controller={controller}
          tab={moreTab} setTab={selectMoreTab} selectedDay={selectedDay}
          setSelectedDay={selectMoreDay} backup={backup} importBackup={importBackup}
          notes={notes} setNotes={setNotes} actions={actions} entities={entities} resolve={resolve}
          privateLinks={privateLinks} open={setLightbox}
        />}
      </div>
    </AppShell>
  );
}
