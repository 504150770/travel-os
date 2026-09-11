'use client';

import Image from 'next/image';
import { Camera, ExternalLink, ImageIcon, Navigation, Trash2, X } from 'lucide-react';
import type { Entity } from '@/lib/entity-library';
import { useEditablePlan } from '@/hooks/use-editable-plan';
import { useDialogLifecycle } from '@/hooks/use-dialog-lifecycle';
import { openGalleryRequest, selectCoverImage } from '@/lib/media';
import type { DiscoverTab, LightboxImage } from '@/features/app/appModel';
import { cityNames } from '@/features/app/appModel';
import { hotelForCity, mapLinks } from '@/features/trip/tripModel';
import { EntityActions, Favorite, Media } from '@/views/shared/EntityUi';
import { useDiscoverController } from '@/features/discover/useDiscoverController';

function EntityDetailModal({
  entity,
  selectedDay,
  actions,
  open,
  close,
}: {
  entity: Entity;
  selectedDay: number;
  actions: ReturnType<typeof useEditablePlan>;
  open: (image: LightboxImage) => void;
  close: () => void;
}) {
  const dialogRef = useDialogLifecycle(close);
  const links = mapLinks(entity);
  const cover = selectCoverImage(entity.images);
  const dishLabel = typeof entity.raw.dishes === 'string' ? entity.raw.dishes : '';
  const orders = ['restaurant', 'cafe'].includes(entity.type)
    ? dishLabel
        .split(/[、，,；;]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  return (
    <div
      className="detail-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <dialog
        ref={dialogRef}
        open
        className="detail-modal"
        aria-label={`${entity.name}详情`}
        aria-modal="true"
      >
        <button className="detail-close" onClick={close} aria-label="关闭">
          <X />
        </button>
        <button
          className="detail-hero detail-hero-button"
          onClick={() => cover && open(openGalleryRequest(entity.id, entity.name, entity.images, cover))}
          aria-label={`Open ${entity.name} gallery`}
        >
          {cover ? (
            <Image
              unoptimized
              src={cover.file}
              alt={entity.name}
              fill
              sizes="(max-width:680px) 100vw, 720px"
            />
          ) : (
            <div className="photo-pending">
              <ImageIcon />
              <span>PHOTO PENDING</span>
            </div>
          )}
          {cover && <span className="media-count">{entity.images.length} Photos</span>}
        </button>
        <div className="detail-body">
          <span>
            {entity.type.toUpperCase()} · {entity.city}
          </span>
          <h2>{entity.name}</h2>
          <p className="entity-detail-copy">
            {entity.description || entity.notes || '现场信息以官方页面为准。'}
          </p>
          {orders.length > 0 && (
            <section className="what-to-order">
              <span>WHAT TO ORDER</span>
              <div>
                {orders.map((order) => {
                  const related = entity.images.find((image) =>
                    image.matchesDishes?.some((dish) => dish === order),
                  );
                  return (
                    <button
                      key={order}
                      disabled={!related}
                      onClick={() => related && open(openGalleryRequest(entity.id, entity.name, entity.images, related))}
                    >
                      {related && <Image unoptimized src={related.file} alt={related.title} width={72} height={54} />}
                      <span>{order}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          <div className="detail-facts">
            <p>
              <b>价格 / 票务</b>
              {entity.priceLabel}
            </p>
            <p>
              <b>营业时间</b>
              {entity.openingHours}
            </p>
            <p>
              <b>地址</b>
              {entity.address}
            </p>
            <p>
              <b>最近核对</b>
              {entity.lastVerified}
            </p>
          </div>
          <div className="detail-actions">
            <a href={links.google} target="_blank" rel="noreferrer">
              Google Maps <ExternalLink />
            </a>
            {entity.hotelAnchor && (
              <a
                href={entity.hotelAnchor.directionsUrl}
                target="_blank"
                rel="noreferrer"
              >
                从酒店出发 <Navigation />
              </a>
            )}
            <a href={links.xhs} target="_blank" rel="noreferrer">
              小红书攻略
            </a>
            {entity.source.startsWith('http') && (
              <a href={entity.source} target="_blank" rel="noreferrer">
                官网 / 来源 <ExternalLink />
              </a>
            )}
          </div>
          <EntityActions
            entity={entity}
            selectedDay={selectedDay}
            addEntity={actions.addEntity}
            placement={actions.placement}
          />
        </div>
      </dialog>
    </div>
  );
}

function ExploreCard({
  entity,
  selectedDay,
  open,
  inspect,
  favorites,
  setFavorites,
  actions,
}: {
  entity: Entity;
  selectedDay: number;
  open: (image: LightboxImage) => void;
  inspect: (entity: Entity) => void;
  favorites: Record<string, boolean>;
  setFavorites: (v: Record<string, boolean>) => void;
  actions: ReturnType<typeof useEditablePlan>;
}) {
  const menu = entity.raw.menu as Record<string, unknown> | undefined;
  const stay = hotelForCity(entity.city);
  const hotelFit =
    typeof entity.raw.distance === 'string'
      ? entity.raw.distance
      : '点击从酒店出发获取实时路线';
  return (
    <article className="explore-card">
      <Media images={entity.images} entityId={entity.id} name={entity.name} open={open} />
      <Favorite id={entity.id} value={favorites} setValue={setFavorites} />
      <button className="explore-open" onClick={() => inspect(entity)}>
        <small>
          {entity.type} · {entity.priceLabel}
        </small>
        <h2>{entity.name}</h2>
        <span>查看详情 →</span>
      </button>
      <p>{entity.description || entity.notes}</p>
      {stay && (
        <p className="hotel-fit">
          FROM HOTEL · {stay.hotelName} · {hotelFit}
        </p>
      )}
      {entity.images[0] && (
        <div className="photo-tip">
          <Camera />
          <span>
            {entity.images[0].bestTime ?? '最佳时间出发前确认'} ·{' '}
            {entity.images[0].composition ?? '人物机位出发前确认'}
          </span>
        </div>
      )}
      <dl>
        <div>
          <dt>营业</dt>
          <dd>{entity.openingHours}</dd>
        </div>
        <div>
          <dt>核对</dt>
          <dd>{entity.lastVerified}</dd>
        </div>
        {menu && (
          <div>
            <dt>菜单</dt>
            <dd>{String(menu.status)}</dd>
          </div>
        )}
      </dl>
      {entity.links.menu && (
        <a
          className="menu-link"
          href={entity.links.menu}
          target="_blank"
          rel="noreferrer"
        >
          查看菜单 <ExternalLink />
        </a>
      )}
      <EntityActions
        entity={entity}
        selectedDay={selectedDay}
        addEntity={actions.addEntity}
        placement={actions.placement}
      />
    </article>
  );
}

export function DiscoverView({
  selectedDay,
  entities,
  resolve,
  actions,
  open,
  favorites,
  setFavorites,
  deleteCustom,
  tab,
  setTab,
  city,
  setCity,
}: {
  selectedDay: number;
  entities: Entity[];
  resolve: (id: string) => Entity | undefined;
  actions: ReturnType<typeof useEditablePlan>;
  open: (image: LightboxImage) => void;
  favorites: Record<string, boolean>;
  setFavorites: (v: Record<string, boolean>) => void;
  deleteCustom: (id: string) => void;
  tab: DiscoverTab;
  setTab: (tab: DiscoverTab) => void;
  city: string;
  setCity: (city: string) => void;
}) {
  const { detailEntity, setDetailEntity, shown, picks, photos } = useDiscoverController({ tab, city, entities });
  return (
    <div className="v2-view">
      <header className="v2-heading">
        <span>EXPLORE / INSPIRATION</span>
        <h1>一个内容库，随时加入行程</h1>
        <p>拍摄提示和XHS入口附着在每个Entity；不会再复制地点资料。</p>
      </header>
      <div className="subnav">
        {(
          [
            ['places', 'PLACES'],
            ['food', 'FOOD'],
            ['gym', 'GYM'],
            ['shopping', 'SHOPPING'],
            ['picks', 'QUICK PICKS'],
            ['photos', 'PHOTO LIBRARY'],
          ] as [DiscoverTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="city-row">
        {cityNames.map((name) => (
          <button
            key={name}
            className={city === name ? 'active' : ''}
            onClick={() => setCity(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === 'picks' ? (
        <div className="quick-pick-grid">
          {picks.map((pick) => {
            const entity = resolve(pick.entityId);
            return (
              entity && (
                <article key={`${pick.label}-${pick.entityId}`}>
                  <span>{pick.label}</span>
                  <Media
                    images={entity.images}
                    entityId={entity.id}
                    name={entity.name}
                    open={open}
                  />
                  <h2>{entity.name}</h2>
                  <EntityActions
                    entity={entity}
                    selectedDay={selectedDay}
                    addEntity={actions.addEntity}
                    placement={actions.placement}
                  />
                </article>
              )
            );
          })}
        </div>
      ) : tab === 'photos' ? (
        <div className="visual-grid">
          {photos.flatMap((entity) =>
            entity.images.map((image) => (
              <article key={`${entity.id}-${image.file}`}>
                <button
                  className="visual-image"
                  onClick={() =>
                    open(openGalleryRequest(entity.id, entity.name, entity.images, image))
                  }
                >
                  <Image
                    unoptimized
                    src={image.file}
                    alt={image.caption}
                    fill
                    sizes="(max-width:680px) 50vw, 28vw"
                  />
                </button>
                <span>
                  {entity.city} · {entity.type}
                </span>
                <h3>{entity.name}</h3>
              </article>
            )),
          )}
        </div>
      ) : (
        <div className="explore-grid">
          {shown.map((entity) => (
            <div key={entity.id}>
              <ExploreCard
                entity={entity}
                selectedDay={selectedDay}
                open={open}
                inspect={setDetailEntity}
                favorites={favorites}
                setFavorites={setFavorites}
                actions={actions}
              />
              {entity.type === 'custom' && (
                <button
                  className="delete-custom"
                  onClick={() =>
                    window.confirm('永久删除这个自定义项目？') &&
                    deleteCustom(entity.id)
                  }
                >
                  <Trash2 />
                  Delete Custom Item
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {detailEntity && (
        <EntityDetailModal
          entity={detailEntity}
          selectedDay={selectedDay}
          actions={actions}
          open={open}
          close={() => setDetailEntity(null)}
        />
      )}
    </div>
  );
}
