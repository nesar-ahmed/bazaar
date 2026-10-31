"use client";

import { Fragment, useMemo, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Alert, EmptyState, Panel } from "@/app/components/ui/display";
import { TextInput } from "@/app/components/ui/field";
import { Icon } from "@/app/components/ui/icons";
import type { Category } from "@/lib/api-types";
import { cx } from "@/lib/cx";
import { plural } from "@/lib/format";

import { ConfirmInline, NotesField, SlugField } from "./controls";
import {
  CATEGORY_DESCRIPTION_MAX,
  CATEGORY_NAME_MAX,
  assignCategoryClash,
  changeCategoryBody,
  createCategoryBody,
  hasErrors,
  validateCategory,
  type CategoryErrors,
  type CategoryForm,
} from "./forms";
import { computeMetrics } from "./metrics";
import { rowDomId, useRowFocus } from "./use-row-focus";
import type { ConsoleStore } from "./use-console-store";

function CategoryCreate({ store }: { store: ConsoleStore }) {
  const [form, setForm] = useState<CategoryForm>({ name: "", slug: "", description: "" });
  const [errors, setErrors] = useState<CategoryErrors>({});
  const [clash, setClash] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit() {
    setClash(null);
    const found = validateCategory(form);
    setErrors(found);
    if (hasErrors(found)) return;

    setSending(true);
    const result = await store.createCategory(createCategoryBody(form));
    setSending(false);

    if (result.ok) {
      setForm({ name: "", slug: "", description: "" });
      setErrors({});
      return;
    }
    setClash(result.message);
    setErrors((current) => assignCategoryClash(result.message, current));
  }

  return (
    <div className="ops-form ops-form--row">
      <TextInput
        label="Aisle name"
        required
        value={form.name}
        maxLength={CATEGORY_NAME_MAX}
        error={errors.name}
        disabled={sending}
        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
      />
      <SlugField
        label="Slug"
        value={form.slug}
        error={errors.slug}
        onChange={(value) => setForm((current) => ({ ...current, slug: value }))}
        onGenerate={() =>
          setForm((current) => ({
            ...current,
            slug: current.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
          }))
        }
      />
      <NotesField
        label="Shelf note"
        value={form.description}
        error={errors.description}
        rows={2}
        maxLength={CATEGORY_DESCRIPTION_MAX}
        hint={`${CATEGORY_DESCRIPTION_MAX} characters. Optional.`}
        onChange={(value) => setForm((current) => ({ ...current, description: value }))}
      />
      <div className="ops-form__foot">
        <Button variant="cta" loading={sending} onClick={() => void submit()}>
          Add aisle
        </Button>
      </div>
      {clash ? (
        <Alert tone="error" className="ops-form__alert">
          {clash}
        </Alert>
      ) : null}
    </div>
  );
}

function CategoryEditor({
  category,
  store,
  onDone,
}: {
  category: Category;
  store: ConsoleStore;
  onDone: () => void;
}) {
  const [form, setForm] = useState<CategoryForm>({
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
  });
  const [errors, setErrors] = useState<CategoryErrors>({});
  const [clash, setClash] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit() {
    setClash(null);
    const found = validateCategory(form);
    setErrors(found);
    if (hasErrors(found)) return;

    const body = changeCategoryBody(category, form);
    if (Object.keys(body).length === 0) {
      setClash("Nothing changed yet. Edit a field first.");
      return;
    }

    setSending(true);
    const result = await store.saveCategory(category.id, body);
    setSending(false);

    if (result.ok) {
      onDone();
      return;
    }
    setClash(result.message);
    setErrors((current) => assignCategoryClash(result.message, current));
  }

  return (
    <div className="ops-editor__inner">
      <p className="label ops-editor__eyebrow">Editing aisle {category.id}</p>
      <div className="ops-form ops-form--row">
        <TextInput
          label="Aisle name"
          required
          value={form.name}
          maxLength={CATEGORY_NAME_MAX}
          error={errors.name}
          disabled={sending}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
        <SlugField
          label="Slug"
          value={form.slug}
          error={errors.slug}
          onChange={(value) => setForm((current) => ({ ...current, slug: value }))}
          onGenerate={() =>
            setForm((current) => ({
              ...current,
              slug: current.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
            }))
          }
        />
        <NotesField
          label="Shelf note"
          value={form.description}
          error={errors.description}
          rows={2}
          maxLength={CATEGORY_DESCRIPTION_MAX}
          onChange={(value) => setForm((current) => ({ ...current, description: value }))}
        />
      </div>
      {clash ? (
        <Alert tone="error" className="ops-form__alert">
          {clash}
        </Alert>
      ) : null}
      <div className="ops-form__foot">
        <Button variant="cta" loading={sending} onClick={() => void submit()}>
          Save aisle
        </Button>
        <Button variant="quiet" disabled={sending} onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function DeleteCategory({
  category,
  store,
  onCancel,
}: {
  category: Category;
  store: ConsoleStore;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    const result = await store.deleteCategory(category.id, category.name);
    setBusy(false);
    if (!result.ok) {
      setBlocked(result.message);
      return;
    }
    onCancel();
  }

  return (
    <div className="stack">
      <ConfirmInline
        label={`Delete ${category.name}`}
        busy={busy}
        confirmLabel="Delete the aisle"
        onCancel={onCancel}
        onConfirm={() => void confirm()}
        consequence={
          <>
            Deleting <strong>{category.name}</strong> removes the filing option for future
            products. It only succeeds once no product row still points at it, and hidden rows
            count for that check even though the list endpoint no longer shows them.
          </>
        }
      />
      {blocked ? (
        <Alert
          tone="error"
          title="The aisle is still in use"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                store.applyFilters({ search: "", categoryId: category.id });
                store.goTo({
                  tab: "products",
                  kind: "category",
                  id: category.id,
                  label: category.name,
                });
              }}
            >
              Open the products filed here
            </Button>
          }
        >
          {blocked} Move those pieces to another aisle, or hide them, then delete this one again.
        </Alert>
      ) : null}
    </div>
  );
}

export function OpsCategories({ store }: { store: ConsoleStore }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const metrics = useMemo(
    () => computeMetrics(store.products, store.orders),
    [store.products, store.orders],
  );
  const { isWanted, isLast } = useRowFocus(store, "categories", "category", store.categories);

  return (
    <div className="ops-stack">
      <Panel
        id="ops-aisle"
        title="Open a new aisle"
        eyebrow="Creates one category row"
        tone="sunk"
        bodyClass="panel__body--tight"
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<Icon.Refresh size={15} />}
            loading={store.isBusy("categories:read")}
            onClick={() => void store.reloadCategories()}
          >
            Re-read aisles
          </Button>
        }
      >
        <CategoryCreate store={store} />
      </Panel>

      <Panel
        id="ops-aisle-list"
        title="Aisles"
        eyebrow="Taxonomy"
        bodyClass="panel__body--flush"
      >
        {store.categories.length === 0 ? (
          <EmptyState
            icon={<Icon.Layers size={22} />}
            title="No aisles yet"
          >
            Products can live unfiled, but an aisle each makes the catalog filter useful. Add the
            first one above.
          </EmptyState>
        ) : (
          <div className="table-wrap ops-scroll">
            <table className="table ops-table">
              <caption>
                {plural(store.categories.length, "aisle")} by name. Piece counts come from the{" "}
                {plural(store.products.length, "product row")} this console holds; pieces hidden by
                a soft delete are not counted here because the list endpoint does not return them.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Slug</th>
                  <th scope="col">Shelf note</th>
                  <th scope="col" className="col-num">
                    Pieces
                  </th>
                  <th scope="col" className="col-actions">
                    Row actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {store.categories.map((category) => {
                  const entry = metrics.pieces.get(category.id);
                  return (
                    <Fragment key={category.id}>
                      <tr
                        id={rowDomId("category", category.id)}
                        tabIndex={-1}
                        className={cx(
                          "ops-row",
                          isLast(category.id) && "ops-row--last",
                          isWanted(category.id) && "ops-row--wanted",
                        )}
                        aria-label={category.name}
                      >
                        <td data-label="Name">
                          <span className="ops-piece">
                            <strong className="ops-piece__name">{category.name}</strong>
                            <span className="ops-piece__meta">
                              <span className="mono">aisle {category.id}</span>
                            </span>
                          </span>
                        </td>
                        <td data-label="Slug">
                          <span className="mono">{category.slug}</span>
                        </td>
                        <td data-label="Shelf note">
                          {category.description ? (
                            <span className="ops-note-text">{category.description}</span>
                          ) : (
                            <span className="muted">No note</span>
                          )}
                        </td>
                        <td className="col-num" data-label="Pieces">
                          <span className="num">{entry?.live ?? 0}</span>
                          {entry?.hidden ? (
                            <span className="ops-piece__hidden tiny">
                              +{entry.hidden} hidden
                            </span>
                          ) : null}
                        </td>
                        <td className="col-actions" data-label="Actions">
                          {confirming === category.id ? (
                            <DeleteCategory
                              category={category}
                              store={store}
                              onCancel={() => setConfirming(null)}
                            />
                          ) : (
                            <>
                              <Button
                                variant="quiet"
                                size="sm"
                                className="ops-tap"
                                icon={<Icon.Pencil size={14} />}
                                aria-expanded={editing === category.id}
                                onClick={() =>
                                  setEditing((current) =>
                                    current === category.id ? null : category.id,
                                  )
                                }
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="ops-tap"
                                icon={<Icon.Trash size={14} />}
                                disabled={store.isBusy(`category:${category.id}`)}
                                onClick={() => {
                                  setEditing(null);
                                  setConfirming(category.id);
                                }}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>

                      {editing === category.id ? (
                        <tr className="ops-editor">
                          <td colSpan={5}>
                            <CategoryEditor
                              key={category.id}
                              category={category}
                              store={store}
                              onDone={() => setEditing(null)}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
