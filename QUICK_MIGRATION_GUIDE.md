# Quick Migration Reference - Supabase to API Routes

## 🎯 5-Minute Component Migration Guide

### Pattern Overview

**Every component follows the same pattern:**
1. Remove Supabase import
2. Add toast + router imports
3. Replace Supabase calls with fetch
4. Add error handling
5. Update type definitions

---

## Step-by-Step Migration

### 1. Update Imports

```tsx
// ❌ Remove
import { createClient } from "@/lib/supabase/client"

// ✅ Add
import { toast } from "sonner"
import { useRouter } from "next/navigation"
```

### 2. Add Router Hook

```tsx
export function YourComponent() {
  const router = useRouter()
  // ... rest of component
}
```

### 3. Replace Operations

#### CREATE (POST)

```tsx
// ❌ Before
const supabase = createClient()
const { data, error } = await supabase
  .from("notes")
  .insert({ title, content })
  .select()
  .single()

if (error) {
  alert("Failed")
} else {
  onSuccess(data)
}

// ✅ After
try {
  const response = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content })
  })
  
  if (!response.ok) throw new Error()
  
  const data = await response.json()
  toast.success("Note created successfully")
  onSuccess(data)
  router.refresh()
} catch (error) {
  console.error("Error creating note:", error)
  toast.error("Failed to create note")
}
```

#### UPDATE (PATCH)

```tsx
// ❌ Before
const { data, error } = await supabase
  .from("notes")
  .update({ title, content })
  .eq("id", noteId)
  .select()
  .single()

// ✅ After
try {
  const response = await fetch(`/api/notes?id=${noteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content })
  })
  
  if (!response.ok) throw new Error()
  
  const data = await response.json()
  toast.success("Note updated successfully")
  onUpdate(data)
  router.refresh()
} catch (error) {
  console.error("Error updating note:", error)
  toast.error("Failed to update note")
}
```

#### DELETE

```tsx
// ❌ Before
const { error } = await supabase
  .from("notes")
  .delete()
  .eq("id", noteId)

// ✅ After
try {
  const response = await fetch(`/api/notes?id=${noteId}`, {
    method: "DELETE"
  })
  
  if (!response.ok) throw new Error()
  
  toast.success("Note deleted successfully")
  onDelete(noteId)
  router.refresh()
} catch (error) {
  console.error("Error deleting note:", error)
  toast.error("Failed to delete note")
}
```

#### READ (GET) - Usually done server-side, but if needed:

```tsx
// ❌ Before
const { data, error } = await supabase
  .from("notes")
  .select("*")
  .order("created_at", { ascending: false })

// ✅ After
try {
  const response = await fetch("/api/notes")
  
  if (!response.ok) throw new Error()
  
  const data = await response.json()
  setNotes(data)
} catch (error) {
  console.error("Error fetching notes:", error)
  toast.error("Failed to load notes")
}
```

### 4. Remove Auth Checks

```tsx
// ❌ Remove - API handles auth
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  alert("Not authenticated")
  return
}

// ✅ Auth is automatic in API routes
// Just make the fetch call
```

### 5. Update Type Definitions

```tsx
// ❌ Old Supabase types
interface Note {
  id: string
  user_id: string          // ❌ Snake case
  created_at: string       // ❌ Snake case
  updated_at: string       // ❌ Snake case
}

// ✅ New NeonDB types
interface Note {
  id: string
  userId: string           // ✅ Camel case
  workspaceId: string      // ✅ Added
  createdAt: string        // ✅ Camel case
  updatedAt: string        // ✅ Camel case
}
```

---

## Module-Specific API Endpoints

| Module | Endpoint | Operations |
|--------|----------|------------|
| **Notes** | `/api/notes` | GET, POST, PATCH, DELETE |
| **Food** | `/api/food` | GET, POST, PATCH, DELETE |
| **Fitness** | `/api/fitness` | GET, POST, PATCH, DELETE |
| **Time** | `/api/time` | GET, POST, PATCH, DELETE |
| **Skincare** | `/api/skincare` | GET, POST, PATCH, DELETE |
| **Saved** | `/api/saved` | GET, POST, PATCH, DELETE |
| **Fashion** | `/api/fashion` | GET, POST, PATCH, DELETE |
| **Fashion Upload** | `/api/fashion/upload` | POST |
| **Profile** | `/api/profile` | GET, PATCH |
| **Profile Avatar** | `/api/profile` | POST (FormData) |
| **Finance** | `/api/finance/transactions` | GET, POST, PATCH, DELETE |
| **Finance Balances** | `/api/finance/balances` | GET |

---

## Field Name Mappings

Common field name changes from Supabase to NeonDB:

| Supabase (snake_case) | NeonDB (camelCase) |
|----------------------|-------------------|
| `user_id` | `userId` |
| `workspace_id` | `workspaceId` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `duration_minutes` | `duration` |
| `is_favorite` | `isFavorite` |
| `is_pinned` | `isPinned` |
| `is_archived` | `isArchived` |
| `wear_count` | `wearCount` |
| `food_name` | `foodName` |
| `product_name` | `productName` |
| `routine_time` | `routineTime` |
| `purchase_date` | `purchaseDate` |
| `expiry_date` | `expiryDate` |

---

## Common Patterns

### Dialog/Modal Submit Handler

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)

  try {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        category,
        tags,
      })
    })

    if (!response.ok) {
      throw new Error("Failed to create note")
    }

    const data = await response.json()
    toast.success("Note created successfully")
    resetForm()
    onOpenChange(false)
    router.refresh()
  } catch (error) {
    console.error("[Notes] Error:", error)
    toast.error("Failed to create note")
  } finally {
    setIsLoading(false)
  }
}
```

### Delete Handler with Confirmation

```tsx
const handleDelete = async () => {
  if (!confirm("Are you sure you want to delete this item?")) {
    return
  }

  setIsDeleting(true)

  try {
    const response = await fetch(`/api/notes?id=${note.id}`, {
      method: "DELETE"
    })

    if (!response.ok) {
      throw new Error("Failed to delete note")
    }

    toast.success("Note deleted successfully")
    onDelete(note.id)
  } catch (error) {
    console.error("[Notes] Delete error:", error)
    toast.error("Failed to delete note")
  } finally {
    setIsDeleting(false)
  }
}
```

### Toggle Favorite/Pin

```tsx
const handleToggleFavorite = async () => {
  setIsUpdating(true)

  try {
    const response = await fetch(`/api/notes?id=${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isFavorite: !note.isFavorite
      })
    })

    if (!response.ok) {
      throw new Error("Failed to update note")
    }

    const data = await response.json()
    onUpdate(data)
    toast.success(data.isFavorite ? "Added to favorites" : "Removed from favorites")
  } catch (error) {
    console.error("[Notes] Toggle error:", error)
    toast.error("Failed to update note")
  } finally {
    setIsUpdating(false)
  }
}
```

---

## Image Upload Pattern (Fashion/Profile)

```tsx
const handleImageUpload = async (file: File) => {
  setIsUploading(true)

  try {
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch("/api/fashion/upload", {
      method: "POST",
      body: formData // Note: No Content-Type header for FormData
    })

    if (!response.ok) {
      throw new Error("Failed to upload image")
    }

    const { imageUrl } = await response.json()
    setImageUrl(imageUrl)
    toast.success("Image uploaded successfully")
  } catch (error) {
    console.error("[Upload] Error:", error)
    toast.error("Failed to upload image")
  } finally {
    setIsUploading(false)
  }
}
```

---

## Checklist Per Component

For each component you migrate:

- [ ] Remove `import { createClient } from "@/lib/supabase/client"`
- [ ] Add `import { toast } from "sonner"`
- [ ] Add `import { useRouter } from "next/navigation"`
- [ ] Add `const router = useRouter()`
- [ ] Replace all `supabase.from()` calls with `fetch()`
- [ ] Replace `alert()` with `toast.error()` or `toast.success()`
- [ ] Add `router.refresh()` after successful mutations
- [ ] Update field names to camelCase
- [ ] Remove auth checks (handled by API)
- [ ] Test: Create, Read, Update, Delete
- [ ] Verify toast notifications appear
- [ ] Verify page refreshes after mutations

---

## Testing Each Component

After migration:

1. **Open the component in browser**
2. **Test Create:** Add new item → Should see success toast
3. **Test Update:** Edit item → Should see success toast
4. **Test Delete:** Remove item → Should see success toast
5. **Test Error:** Disconnect network → Should see error toast
6. **Check Console:** No errors or warnings
7. **Check Database:** Open `pnpm db:studio` → Verify data

---

## Troubleshooting

**Error: 401 Unauthorized**
- API route requires authentication
- Make sure you're logged in
- Check NextAuth session

**Error: 404 Not Found**
- Check endpoint path is correct
- Make sure API route file exists
- Verify file is in `app/api/...` directory

**Error: 400 Bad Request**
- Check request body matches Zod schema
- Verify field names are correct (camelCase)
- Check required fields are included

**TypeScript Error: Property doesn't exist**
- Update interface definitions
- Change snake_case → camelCase
- Add missing fields (workspaceId, etc.)

**Data not refreshing**
- Add `router.refresh()` after mutations
- Make sure you're using `useRouter` from `next/navigation`

---

## Time Estimates

| Component Type | Time per Component |
|----------------|-------------------|
| Simple form (create/edit) | 5-10 minutes |
| List item with delete | 3-5 minutes |
| Complex form with validation | 10-15 minutes |
| Image upload component | 10-15 minutes |
| Dashboard/list view | 5-10 minutes |

**Total for 36 components: 3-4 hours**

---

## Need Help?

Check these files:
- `SUPABASE_MIGRATION_COMPLETE.md` - Full migration guide
- `MIGRATION_SUMMARY.md` - Overview and progress
- `components/time/add-time-log-dialog.tsx` - Example migrated component
- `app/api/notes/route.ts` - Example API route

**The pattern is consistent across all components. Once you do 2-3, the rest are copy-paste!**
