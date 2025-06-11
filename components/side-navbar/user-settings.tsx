"use client";

import { Button } from "@/components/ui/button";
import { SettingsIcon } from "lucide-react";
import { Models } from "@/app/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSettings,
  SettingsSchema,
  settingsSchema,
  updateSettings,
} from "@/lib/userSettings";
import toast from "react-hot-toast";

type Props = {
  showLabel?: boolean;
};

export const UserSettings = ({ showLabel = false }: Props) => {
  const form = useForm<SettingsSchema>({
    resolver: zodResolver(settingsSchema),
    defaultValues: getSettings(),
  });

  function onSubmit(values: SettingsSchema) {
    updateSettings({
      ...getSettings(),
      ...values,
    });
    toast.success("Saved settings!", {
      position: "bottom-center",
    });
  }

  return (
    <Dialog>
      <DialogTrigger className="w-full flex items-center justify-start gap-4 px-1">
        <SettingsIcon className="w-6 h-6" />

        {showLabel && <span className="font-medium text-sm">Settings</span>}
      </DialogTrigger>

      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>

            <FormField
              control={form.control}
              name="anthropicApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anthropic API Key</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="openaiApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OpenAI API Key</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={Models.claude}>Claude Sonnet</SelectItem>
                      <SelectItem value={Models.claude35Sonnet}>Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value={Models.claude37Sonnet}>Claude 3.7 Sonnet</SelectItem>
                      <SelectItem value={Models.gpt4oMini}>GPT-4o Mini</SelectItem>
                      <SelectItem value={Models.gpt4o}>GPT-4o</SelectItem>
                      <SelectItem value={Models.gpt41}>GPT-4.1</SelectItem>
                      <SelectItem value={Models.gpt41Mini}>GPT-4.1 Mini</SelectItem>
                      <SelectItem value={Models.gpt41Nano}>GPT-4.1 Nano</SelectItem>
                      <SelectItem value={Models.gpt4turbo}>GPT-4 Turbo</SelectItem>
                      <SelectItem value={Models.gpt35turbo}>GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
