"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Building2,
  GripVertical,
  Plus,
  X,
  MapPin,
  Loader2,
  Home,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShowcasePropertyManagerProps {
  showcaseProperties: any[];
  availableProperties: any[];
}

interface SortablePropertyItemProps {
  property: any;
  onRemove: (propertyId: string) => void;
  isRemoving: boolean;
}

function SortablePropertyItem({ property, onRemove, isRemoving }: SortablePropertyItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: property.propertyId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-background border rounded-lg group"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="w-16 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
        {property.property?.linkedDocuments?.[0]?.document_file_url ? (
          <img
            src={property.property.linkedDocuments[0].document_file_url}
            alt={property.property?.property_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="h-5 w-5 text-muted-foreground/50" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">
          {property.property?.property_name}
        </h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {property.property?.address_city && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {property.property.address_city}
            </span>
          )}
          {property.property?.price && (
            <span className="font-medium text-blue-600">
              {formatPrice(property.property.price)}
            </span>
          )}
        </div>
      </div>

      {property.property?.transaction_type && (
        <Badge variant="outline" className="text-xs flex-shrink-0">
          {property.property.transaction_type === "SALE" ? "Πώληση" : "Ενοικίαση"}
        </Badge>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={() => onRemove(property.propertyId)}
        disabled={isRemoving}
      >
        {isRemoving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <X className="h-4 w-4 text-destructive" />
        )}
      </Button>
    </div>
  );
}

export function ShowcasePropertyManager({
  showcaseProperties: initialShowcase,
  availableProperties: initialAvailable,
}: ShowcasePropertyManagerProps) {
  const [showcaseProperties, setShowcaseProperties] = useState(initialShowcase);
  const [availableProperties, setAvailableProperties] = useState(initialAvailable);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = showcaseProperties.findIndex((p) => p.propertyId === active.id);
      const newIndex = showcaseProperties.findIndex((p) => p.propertyId === over.id);

      const newOrder = arrayMove(showcaseProperties, oldIndex, newIndex);
      setShowcaseProperties(newOrder);

      // Save the new order to the server
      try {
        setIsSavingOrder(true);
        await axios.put("/api/profile/showcase", {
          orderedIds: newOrder.map((p) => p.propertyId),
        });
        router.refresh();
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save order. Please try again.",
        });
        // Revert on error
        setShowcaseProperties(showcaseProperties);
      } finally {
        setIsSavingOrder(false);
      }
    }
  };

  const handleAddProperty = async (propertyId: string) => {
    try {
      setIsAdding(propertyId);
      const response = await axios.post("/api/profile/showcase", { propertyId });

      // Move property from available to showcase
      const property = availableProperties.find((p) => p.id === propertyId);
      if (property) {
        setAvailableProperties(availableProperties.filter((p) => p.id !== propertyId));
        setShowcaseProperties([
          ...showcaseProperties,
          { propertyId, property, order: showcaseProperties.length },
        ]);
      }

      toast({
        variant: "success",
        title: "Property Added",
        description: "Property has been added to your showcase.",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || "Failed to add property.",
      });
    } finally {
      setIsAdding(null);
    }
  };

  const handleRemoveProperty = async (propertyId: string) => {
    try {
      setIsRemoving(propertyId);
      await axios.delete(`/api/profile/showcase/${propertyId}`);

      // Move property back to available
      const removedItem = showcaseProperties.find((p) => p.propertyId === propertyId);
      if (removedItem?.property) {
        setAvailableProperties([...availableProperties, removedItem.property]);
      }
      setShowcaseProperties(showcaseProperties.filter((p) => p.propertyId !== propertyId));

      toast({
        variant: "success",
        title: "Property Removed",
        description: "Property has been removed from your showcase.",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || "Failed to remove property.",
      });
    } finally {
      setIsRemoving(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4" />
              Showcase Properties
            </CardTitle>
            <CardDescription>
              Select and order which properties appear on your public profile
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={availableProperties.length === 0}>
                <Plus className="h-4 w-4 mr-1" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Property to Showcase</DialogTitle>
                <DialogDescription>
                  Select a property to display on your public profile
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[400px] pr-4">
                {availableProperties.length > 0 ? (
                  <div className="space-y-2">
                    {availableProperties.map((property) => (
                      <div
                        key={property.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-16 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                          {property.linkedDocuments?.[0]?.document_file_url ? (
                            <img
                              src={property.linkedDocuments[0].document_file_url}
                              alt={property.property_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {property.property_name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {property.address_city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {property.address_city}
                              </span>
                            )}
                            {property.price && (
                              <span className="font-medium text-blue-600">
                                {formatPrice(property.price)}
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleAddProperty(property.id)}
                          disabled={isAdding === property.id}
                        >
                          {isAdding === property.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              Add <ArrowRight className="h-3 w-3 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">
                      No more properties available to add
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add more properties in the MLS section
                    </p>
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {showcaseProperties.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              Drag to reorder • Properties will appear in this order on your profile
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={showcaseProperties.map((p) => p.propertyId)}
                strategy={verticalListSortingStrategy}
              >
                {showcaseProperties.map((property) => (
                  <SortablePropertyItem
                    key={property.propertyId}
                    property={property}
                    onRemove={handleRemoveProperty}
                    isRemoving={isRemoving === property.propertyId}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {isSavingOrder && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving order...
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 border rounded-lg bg-muted/20">
            <Home className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              No properties in your showcase yet
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Add properties to display on your public profile
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddDialogOpen(true)}
              disabled={availableProperties.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Your First Property
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}








